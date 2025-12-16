import { Server } from "http";

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

    const manager = new WebSocketManager({} as Server);

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

    const manager = new WebSocketManager({} as Server);
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
    const manager = new WebSocketManager({} as Server);
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

  it("sendToUser should send only to specified user", async () => {
    (authenticateWebSocket as jest.Mock).mockResolvedValue({
      userId: "u1",
      email: "a",
    });
    const manager = new WebSocketManager({} as Server);
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
