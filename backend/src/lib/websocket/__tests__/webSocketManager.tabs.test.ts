import { EventEmitter } from "events";
import type { Server } from "http";

import { authenticateWebSocket } from "../auth";
import {
  hasCallHeldByConnection,
  participantDisconnected,
  participantRevoked,
} from "../../../services/callSignaling";
import { HEARTBEAT_INTERVAL_MS, HOLDER_PROBE_TIMEOUT_MS } from "../connection.constants";
import { WebSocketManager } from "../webSocketManager";
import { connectSocket, makeSocket } from "./wsManagerHarness";
import type { SocketStub } from "./wsManagerHarness";

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
  hasCallHeldByConnection: jest.fn(() => false),
  isCallAwaitingReturnOf: jest.fn(() => false),
  participantDisconnected: jest.fn(async () => undefined),
  participantRevoked: jest.fn(async () => undefined),
  processCallSignal: jest.fn(async () => undefined),
}));

// Fake timers: a terminated socket closes, as with ws.
const closingSocket = () => makeSocket({ closeOnTerminate: true });

const READY = JSON.stringify({ type: "connection_ready" });
const WAITING = JSON.stringify({ type: "connection_waiting", reason: "call" });

describe("WebSocketManager tabs and heartbeat", () => {
  let server: EventEmitter;
  let manager: WebSocketManager;

  const connectTutor = (ws: SocketStub, url = "/ws?token=t") =>
    connectSocket(manager, "tutor", ws, url);
  const connectStudent = (ws: SocketStub, url = "/ws/student?token=t") =>
    connectSocket(manager, "student", ws, url);
  const pools = [
    ["tutor", connectTutor, "tutor-1"] as const,
    ["student", connectStudent, "student-1"] as const,
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(hasCallHeldByConnection).mockReturnValue(false);
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
      const stale = closingSocket();
      const resumed = closingSocket();
      await connect(stale, "/ws?token=t&tab=tab-a");

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-a");

      expect(resumed.close).not.toHaveBeenCalled();
      expect(stale.close).toHaveBeenCalledWith(4000, "Replaced by newer connection");
      expect(manager.getConnection(kind, id)).toBe(resumed);
    }
  );

  it.each(pools)(
    "should let the same %s tab reconnect during its call and keep that call",
    async (kind, connect, id) => {
      const stale = closingSocket();
      const resumed = closingSocket();
      await connect(stale, "/ws?token=t&tab=tab-a");
      jest.mocked(hasCallHeldByConnection).mockReturnValue(true);

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-a");

      stale.emit("close");

      expect(resumed.close).not.toHaveBeenCalled();
      expect(participantRevoked).not.toHaveBeenCalled();
      expect(participantDisconnected).not.toHaveBeenCalled();
      expect(manager.getConnection(kind, id)).toBe(resumed);
    }
  );

  it.each(pools)(
    "should still refuse a %s reconnect from another tab",
    async (kind, connect, id) => {
      const live = closingSocket();
      const resumed = closingSocket();
      const fresh = closingSocket();
      await connect(live, "/ws?token=t&tab=tab-a");

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-b");
      jest.mocked(hasCallHeldByConnection).mockReturnValue(true);
      await connect(fresh, "/ws?token=t&tab=tab-b");

      live.emit("pong");

      expect(resumed.close).toHaveBeenCalledWith(4000, "Connection held by another tab");
      expect(fresh.close).not.toHaveBeenCalled();
      expect(fresh.send).toHaveBeenCalledWith(WAITING);
      expect(manager.getConnection(kind, id)).toBe(live);
    }
  );

  it("should treat a malformed tab id as absent", async () => {
    const live = closingSocket();
    const resumed = closingSocket();
    await connectTutor(live, "/ws?token=t&tab=bad%20id");

    await connectTutor(resumed, "/ws?token=t&resume=1&tab=bad%20id");

    expect(resumed.close).toHaveBeenCalledWith(4000, "Connection held by another tab");
    expect(manager.getConnection("tutor", "tutor-1")).toBe(live);
  });

  it.each(pools)(
    "should send connection_ready only to a registered %s socket",
    async (_kind, connect) => {
      const live = closingSocket();
      const refused = closingSocket();
      await connect(live, "/ws?token=t&tab=tab-a");

      await connect(refused, "/ws?token=t&resume=1&tab=tab-b");

      expect(live.send.mock.calls[0]).toEqual([READY]);
      expect(refused.send).not.toHaveBeenCalled();
    }
  );

  it.each(pools)(
    "should terminate a %s socket that misses a pong and report it gone, not end its call",
    async (kind, connect, id) => {
      const ws = closingSocket();
      await connect(ws);

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(ws.ping).toHaveBeenCalledTimes(1);
      expect(ws.terminate).not.toHaveBeenCalled();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(ws.terminate).toHaveBeenCalled();
      expect(manager.getConnection(kind, id)).toBeUndefined();
      expect(participantDisconnected).toHaveBeenCalledWith({ kind, id }, undefined);
      expect(participantRevoked).not.toHaveBeenCalled();
    }
  );

  it.each(pools)("should keep a %s socket that answers pings", async (kind, connect, id) => {
    const ws = closingSocket();
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
    const ws = closingSocket();
    await connectTutor(ws);

    server.emit("close");
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);

    expect(ws.ping).not.toHaveBeenCalled();
  });

  it.each(pools)(
    "should terminate a %s holder that does not answer the probe a waiting tab starts",
    async (kind, connect, id) => {
      const live = closingSocket();
      await connect(live, "/ws?token=t&tab=tab-a");
      jest.mocked(hasCallHeldByConnection).mockReturnValue(true);

      await connect(closingSocket(), "/ws?token=t&tab=tab-b");
      expect(live.ping).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(HOLDER_PROBE_TIMEOUT_MS - 1);
      expect(live.terminate).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);

      expect(live.terminate).toHaveBeenCalledTimes(1);
      expect(manager.getConnection(kind, id)).toBeUndefined();
      expect(participantDisconnected).toHaveBeenCalledWith({ kind, id }, "tab-a");
    }
  );

  it.each(pools)(
    "should keep a %s holder that answers the probe, even across a heartbeat tick",
    async (kind, connect, id) => {
      const live = closingSocket();
      await connect(live, "/ws?token=t&tab=tab-a");
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS - 1000);
      jest.mocked(hasCallHeldByConnection).mockReturnValue(true);

      await connect(closingSocket(), "/ws?token=t&tab=tab-b");
      jest.advanceTimersByTime(1000);
      live.emit("pong");
      jest.advanceTimersByTime(HOLDER_PROBE_TIMEOUT_MS);

      expect(live.terminate).not.toHaveBeenCalled();
      expect(manager.getConnection(kind, id)).toBe(live);
    }
  );
});
