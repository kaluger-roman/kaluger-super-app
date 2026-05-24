import { Server } from "http";

const makeFakeServer = (): Server =>
  ({ on: jest.fn() }) as unknown as Server;

// Mocks for dependencies: ws, auth, and messageHandler
jest.mock("ws", () => {
  class MockWSServer {
    public handlers: Record<string, Function> = {};
    public options: any;
    constructor(options: any) {
      this.options = options;
      // register instance for tests
      (MockWSServer.instances as any).push(this);
    }
    on(event: string, fn: Function) {
      this.handlers[event] = fn;
    }
    simulateConnection(ws: any, request: any) {
      if (this.handlers["connection"]) {
        this.handlers["connection"](ws, request);
      }
    }
    static instances: MockWSServer[] = [];
  }

  return {
    WebSocketServer: MockWSServer,
    WebSocket: { OPEN: 1 },
  };
});

jest.mock("../auth", () => ({
  authenticateWebSocket: jest.fn(),
}));

jest.mock("../messageHandler", () => ({
  handleMessage: jest.fn(),
  sendWelcomeMessage: jest.fn(),
}));

import { WebSocketServer, WebSocket } from "ws"; // mocked
import { authenticateWebSocket } from "../auth";
import { handleMessage, sendWelcomeMessage } from "../messageHandler";
import { WebSocketManager } from "../WebSocketManager";

describe("WebSocketManager", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // clear MockWSServer instances
    (WebSocketServer as any).instances.length = 0;
  });

  it("should ignore connection when authenticateWebSocket returns null", async () => {
    (authenticateWebSocket as jest.Mock).mockResolvedValue(null);

    const manager = new WebSocketManager(makeFakeServer());

    const wssInstance = (WebSocketServer as any).instances[0];

    const ws: any = {
      send: jest.fn(),
      on: jest.fn(),
    };

    // simulate incoming connection
    wssInstance.simulateConnection(ws, { url: "/?token=bad" });

    // wait for async handler to complete
    await new Promise((r) => setImmediate(r));

    expect(manager.getConnectedUsersCount()).toBe(0);
  });

  it("should register client and call sendWelcomeMessage and handle messages", async () => {
    const decoded = { userId: "u1", email: "a@b.com" };
    (authenticateWebSocket as jest.Mock).mockResolvedValue(decoded);

    const manager = new WebSocketManager(makeFakeServer());
    const wssInstance = (WebSocketServer as any).instances[0];

    // create ws mock that supports on and triggering events
    const messageHandlers: Record<string, Function> = {};
    const ws: any = {
      send: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: (event: string, fn: Function) => {
        messageHandlers[event] = fn;
      },
    };

    wssInstance.simulateConnection(ws, { url: "/?token=ok" });

    // wait for async handler to complete
    await new Promise((r) => setImmediate(r));

    // client should be registered
    expect(manager.getConnectedUsersCount()).toBe(1);
    expect(manager.getConnectedUsers()).toContain("u1");

    // sendWelcomeMessage should be called with ws and userId
    expect(sendWelcomeMessage).toHaveBeenCalledWith(ws, "u1");

    // Simulate incoming message (JSON) and expect handleMessage to be called
    const payload = { hello: "world" };
    const handler = messageHandlers["message"];
    expect(handler).toBeDefined();
    handler(JSON.stringify(payload));

    expect(handleMessage).toHaveBeenCalledWith(ws, payload);

    // simulate close and ensure client removed
    const closeHandler = messageHandlers["close"];
    expect(closeHandler).toBeDefined();
    closeHandler();
    expect(manager.getConnectedUsersCount()).toBe(0);
  });

  it("broadcastLessonStatusUpdate should send to all clients when no tutorId", async () => {
    (authenticateWebSocket as jest.Mock).mockResolvedValue({
      userId: "u1",
      email: "a",
    });
    const manager = new WebSocketManager(makeFakeServer());
    const wssInstance = (WebSocketServer as any).instances[0];

    const ws1Handlers: Record<string, Function> = {};
    const ws1: any = {
      send: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: (e: string, fn: Function) => (ws1Handlers[e] = fn),
    };

    // connect first client
    wssInstance.simulateConnection(ws1, { url: "/?token=ok1" });

    // wait for first connection
    await new Promise((r) => setImmediate(r));

    // second client
    (authenticateWebSocket as jest.Mock).mockResolvedValue({
      userId: "u2",
      email: "b",
    });
    const ws2Handlers: Record<string, Function> = {};
    const ws2: any = {
      send: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: (e: string, fn: Function) => (ws2Handlers[e] = fn),
    };
    wssInstance.simulateConnection(ws2, { url: "/?token=ok2" });

    // wait for second connection
    await new Promise((r) => setImmediate(r));

    manager.broadcastLessonStatusUpdate("lesson1", "COMPLETED");

    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  it("should keep new client when stale close handler of old socket fires after reconnect (regression: stale close handler race)", async () => {
    const decoded = { userId: "u-reconnect", email: "r@b.com" };
    (authenticateWebSocket as jest.Mock).mockResolvedValue(decoded);

    const manager = new WebSocketManager(makeFakeServer());
    const wssInstance = (WebSocketServer as any).instances[0];

    const oldHandlers: Record<string, Function> = {};
    const oldWs: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: (event: string, fn: Function) => {
        oldHandlers[event] = fn;
      },
    };
    wssInstance.simulateConnection(oldWs, { url: "/?token=old" });
    await new Promise((r) => setImmediate(r));

    // Simulate reconnect with the same userId
    const newHandlers: Record<string, Function> = {};
    const newWs: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: (event: string, fn: Function) => {
        newHandlers[event] = fn;
      },
    };
    wssInstance.simulateConnection(newWs, { url: "/?token=new" });
    await new Promise((r) => setImmediate(r));

    // The previous connection should have been actively closed
    expect(oldWs.close).toHaveBeenCalled();

    // After reconnect there should still be exactly one connection
    expect(manager.getConnectedUsersCount()).toBe(1);

    // Simulate the OLD socket's close handler firing late (TCP keepalive timeout, etc.)
    oldHandlers["close"]();

    // The new client must remain registered — this is the bug we are fixing
    expect(manager.getConnectedUsersCount()).toBe(1);
    expect(manager.sendToUser("u-reconnect", { test: 1 })).toBe(true);
    expect(newWs.send).toHaveBeenCalledWith(JSON.stringify({ test: 1 }));
  });

  it("does not leak the client entry when sendWelcomeMessage throws synchronously (regression: handler order)", async () => {
    // Regression for bug-hunt 2026-05-09 #5: sendWelcomeMessage was invoked
    // before close/error handlers were registered. If ws.send threw (socket
    // already closing), the entry in `clients` was never cleaned up.
    const decoded = { userId: "u-welcome-throws", email: "x@b.com" };
    (authenticateWebSocket as jest.Mock).mockResolvedValue(decoded);
    (sendWelcomeMessage as jest.Mock).mockImplementation(() => {
      throw new Error("socket closed");
    });

    const manager = new WebSocketManager(makeFakeServer());
    const wssInstance = (WebSocketServer as any).instances[0];

    const handlers: Record<string, Function> = {};
    const ws: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: (event: string, fn: Function) => {
        handlers[event] = fn;
      },
    };

    wssInstance.simulateConnection(ws, { url: "/?token=ok" });
    await new Promise((r) => setImmediate(r));

    // Close handler must be registered even though sendWelcomeMessage threw.
    expect(handlers["close"]).toBeDefined();
    expect(handlers["error"]).toBeDefined();

    // Triggering close should clean up the entry.
    handlers["close"]();
    expect(manager.getConnectedUsersCount()).toBe(0);
  });

  it("does not store orphan entry when socket already closed before set (regression: bug-hunt 2026-05-24 #4)", async () => {
    const decoded = { userId: "u-prematurely-closed", email: "x@b.com" };
    (authenticateWebSocket as jest.Mock).mockResolvedValue(decoded);

    const manager = new WebSocketManager(makeFakeServer());
    const wssInstance = (WebSocketServer as any).instances[0];

    const handlers: Record<string, Function> = {};
    const ws: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: (WebSocket as any).CLOSED ?? 3,
      on: (event: string, fn: Function) => {
        handlers[event] = fn;
      },
    };

    wssInstance.simulateConnection(ws, { url: "/?token=ok" });
    await new Promise((r) => setImmediate(r));

    expect(handlers["close"]).toBeDefined();
    expect(handlers["error"]).toBeDefined();
    expect(manager.getConnectedUsersCount()).toBe(0);
    expect(sendWelcomeMessage).not.toHaveBeenCalled();
  });

  it("sendToUser should send only to specified user", async () => {
    (authenticateWebSocket as jest.Mock).mockResolvedValue({
      userId: "u1",
      email: "a",
    });
    const manager = new WebSocketManager(makeFakeServer());
    const wssInstance = (WebSocketServer as any).instances[0];

    const ws: any = {
      send: jest.fn(),
      readyState: (WebSocket as any).OPEN,
      on: jest.fn(),
    };
    wssInstance.simulateConnection(ws, { url: "/?token=ok" });

    // wait for connection to be registered
    await new Promise((r) => setImmediate(r));

    const resultTrue = manager.sendToUser("u1", { test: 1 });
    expect(resultTrue).toBe(true);
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ test: 1 }));

    const resultFalse = manager.sendToUser("missing", { test: 2 });
    expect(resultFalse).toBe(false);
  });
});
