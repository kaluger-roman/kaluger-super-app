import { EventEmitter } from "events";
import type { Server } from "http";
import { WebSocket } from "ws";

import { authenticateWebSocket } from "../auth";
import { hasActiveCall, terminateActiveCallForParticipant } from "../../../services/callSignaling";
import { WebSocketManager } from "../webSocketManager";

jest.mock("../auth", () => ({
  authenticateWebSocket: jest.fn(),
}));

jest.mock("../studentAuth", () => ({
  authenticateStudentWebSocket: jest.fn(async () => ({
    studentUserId: "student-1",
    email: "student@example.com",
  })),
}));

jest.mock("../messageHandler", () => ({
  handleMessage: jest.fn(),
  sendWelcomeMessage: jest.fn(),
}));

jest.mock("../../../services/callSignaling", () => ({
  hasActiveCall: jest.fn(() => false),
  processCallSignal: jest.fn(async () => undefined),
  terminateActiveCallForParticipant: jest.fn(async () => undefined),
}));

type SocketStub = EventEmitter & {
  readyState: number;
  close: jest.Mock;
  send: jest.Mock;
  ping: jest.Mock;
  terminate: jest.Mock;
};

const makeSocket = (): SocketStub => {
  const emitter = new EventEmitter() as SocketStub;
  emitter.readyState = WebSocket.OPEN;
  emitter.close = jest.fn();
  emitter.send = jest.fn();
  emitter.ping = jest.fn();
  emitter.terminate = jest.fn(() => {
    emitter.readyState = WebSocket.CLOSED;
    emitter.emit("close");
  });
  return emitter;
};

type ConnectionHandlers = {
  handleConnection: (ws: unknown, request: unknown) => Promise<void>;
  handleStudentConnection: (ws: unknown, request: unknown) => Promise<void>;
};

const HEARTBEAT_INTERVAL_MS = 30_000;
const READY = JSON.stringify({ type: "connection_ready" });

describe("WebSocketManager tabs and heartbeat", () => {
  let server: EventEmitter;
  let manager: WebSocketManager;

  const connectTutor = (ws: SocketStub, url = "/ws?token=t") =>
    (manager as unknown as ConnectionHandlers).handleConnection.call(manager, ws, { url });
  const connectStudent = (ws: SocketStub, url = "/ws/student?token=t") =>
    (manager as unknown as ConnectionHandlers).handleStudentConnection.call(manager, ws, { url });
  const pools = [
    ["tutor", connectTutor, "tutor-1"] as const,
    ["student", connectStudent, "student-1"] as const,
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(hasActiveCall).mockReturnValue(false);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    (authenticateWebSocket as jest.Mock).mockResolvedValue({ userId: "tutor-1", email: "t@e.com" });
    server = new EventEmitter();
    manager = new WebSocketManager(server as unknown as Server);
  });

  afterEach(() => {
    server.emit("close");
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(pools)(
    "should let the same %s tab replace its own socket on an automatic reconnect",
    async (kind, connect, id) => {
      const stale = makeSocket();
      const resumed = makeSocket();
      await connect(stale, "/ws?token=t&tab=tab-a");

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-a");

      expect(resumed.close).not.toHaveBeenCalled();
      expect(stale.close).toHaveBeenCalledWith(4000, "Replaced by newer connection");
      expect(manager.getConnection(kind, id)).toBe(resumed);
    }
  );

  it.each(pools)(
    "should let the same %s tab reconnect during its call and end that call",
    async (kind, connect, id) => {
      const stale = makeSocket();
      const resumed = makeSocket();
      await connect(stale, "/ws?token=t&tab=tab-a");
      jest.mocked(hasActiveCall).mockReturnValue(true);

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-a");

      expect(resumed.close).not.toHaveBeenCalled();
      expect(terminateActiveCallForParticipant).toHaveBeenCalledWith(kind, id);
      expect(manager.getConnection(kind, id)).toBe(resumed);
    }
  );

  it.each(pools)(
    "should still refuse a %s reconnect from another tab",
    async (kind, connect, id) => {
      const live = makeSocket();
      const resumed = makeSocket();
      const fresh = makeSocket();
      await connect(live, "/ws?token=t&tab=tab-a");

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-b");
      jest.mocked(hasActiveCall).mockReturnValue(true);
      await connect(fresh, "/ws?token=t&tab=tab-b");

      expect(resumed.close).toHaveBeenCalledWith(4000, "Connection held by another tab");
      expect(fresh.close).toHaveBeenCalledWith(4002, "Call in progress in another tab");
      expect(manager.getConnection(kind, id)).toBe(live);
    }
  );

  it("should treat a malformed tab id as absent", async () => {
    const live = makeSocket();
    const resumed = makeSocket();
    await connectTutor(live, "/ws?token=t&tab=bad%20id");

    await connectTutor(resumed, "/ws?token=t&resume=1&tab=bad%20id");

    expect(resumed.close).toHaveBeenCalledWith(4000, "Connection held by another tab");
    expect(manager.getConnection("tutor", "tutor-1")).toBe(live);
  });

  it.each(pools)(
    "should send connection_ready only to a registered %s socket",
    async (_kind, connect) => {
      const live = makeSocket();
      const refused = makeSocket();
      await connect(live, "/ws?token=t&tab=tab-a");

      await connect(refused, "/ws?token=t&resume=1&tab=tab-b");

      expect(live.send.mock.calls[0]).toEqual([READY]);
      expect(refused.send).not.toHaveBeenCalled();
    }
  );

  it.each(pools)(
    "should terminate and unregister a %s socket that misses a pong",
    async (kind, connect, id) => {
      const ws = makeSocket();
      await connect(ws);

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(ws.ping).toHaveBeenCalledTimes(1);
      expect(ws.terminate).not.toHaveBeenCalled();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(ws.terminate).toHaveBeenCalled();
      expect(manager.getConnection(kind, id)).toBeUndefined();
      expect(terminateActiveCallForParticipant).toHaveBeenCalledWith(kind, id);
    }
  );

  it.each(pools)("should keep a %s socket that answers pings", async (kind, connect, id) => {
    const ws = makeSocket();
    await connect(ws);

    for (let beat = 0; beat < 3; beat += 1) {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      ws.emit("pong");
    }

    expect(ws.ping).toHaveBeenCalledTimes(3);
    expect(ws.terminate).not.toHaveBeenCalled();
    expect(manager.getConnection(kind, id)).toBe(ws);
  });

  it("should stop the heartbeat when the server closes", async () => {
    const ws = makeSocket();
    await connectTutor(ws);

    server.emit("close");
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

    expect(ws.ping).not.toHaveBeenCalled();
  });
});
