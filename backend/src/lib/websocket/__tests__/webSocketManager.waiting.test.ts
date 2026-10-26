import { EventEmitter } from "events";
import type { Server } from "http";
import { WebSocket } from "ws";

import { authenticateWebSocket } from "../auth";
import { handleMessage } from "../messageHandler";
import { hasActiveCall, processCallSignal } from "../../../services/callSignaling";
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
const WAITING = JSON.stringify({ type: "connection_waiting", reason: "call" });
const lessonEvent = { type: "lesson_status_updated", lessonId: "l-1", status: "COMPLETED" };
const inviteMessage = Buffer.from(
  JSON.stringify({ type: "call_invite", inviteId: "invite-1", lessonId: "lesson-1" })
);

describe("WebSocketManager sockets waiting for a call in another tab", () => {
  let server: EventEmitter;
  let manager: WebSocketManager;

  const connectTutor = (ws: SocketStub, url = "/ws?token=t&tab=tab-a") =>
    (manager as unknown as ConnectionHandlers).handleConnection.call(manager, ws, { url });
  const connectStudent = (ws: SocketStub, url = "/ws/student?token=t&tab=tab-a") =>
    (manager as unknown as ConnectionHandlers).handleStudentConnection.call(manager, ws, { url });
  const pools = [
    ["tutor", connectTutor, "tutor-1"] as const,
    ["student", connectStudent, "student-1"] as const,
  ];

  // The user is in a call on `live`; `waiting` was opened from another tab meanwhile.
  const startWaiting = async (connect: typeof connectTutor) => {
    const live = makeSocket();
    const waiting = makeSocket();
    await connect(live);
    jest.mocked(hasActiveCall).mockReturnValue(true);
    await connect(waiting, "/ws?token=t&tab=tab-b");
    return { live, waiting };
  };

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
    "should keep a %s socket opened during the call open but unregistered",
    async (kind, connect, id) => {
      const { live, waiting } = await startWaiting(connect);

      expect(waiting.close).not.toHaveBeenCalled();
      expect(waiting.send.mock.calls).toEqual([[WAITING]]);
      expect(manager.getConnection(kind, id)).toBe(live);

      manager.sendToParticipant(kind, id, lessonEvent);
      waiting.emit("message", inviteMessage);

      expect(waiting.send).toHaveBeenCalledTimes(1);
      expect(handleMessage).not.toHaveBeenCalled();
      expect(processCallSignal).not.toHaveBeenCalled();
    }
  );

  it.each(pools)(
    "should close the waiting %s sockets with 4003 once the call ends",
    async (kind, connect, id) => {
      const { live, waiting } = await startWaiting(connect);
      const second = makeSocket();
      await connect(second, "/ws?token=t&tab=tab-c");

      manager.releaseWaitingSockets(kind, id);

      expect(waiting.close).toHaveBeenCalledWith(4003, "Call ended in another tab");
      expect(second.close).toHaveBeenCalledWith(4003, "Call ended in another tab");
      expect(live.close).not.toHaveBeenCalled();
      expect(manager.getConnection(kind, id)).toBe(live);
    }
  );

  it("should not release the waiting sockets of another user", async () => {
    const { waiting } = await startWaiting(connectTutor);

    manager.releaseWaitingSockets("student", "tutor-1");
    manager.releaseWaitingSockets("tutor", "tutor-2");

    expect(waiting.close).not.toHaveBeenCalled();
  });

  it("should close the waiting tutor sockets with 4001 when the token is revoked", async () => {
    const { waiting } = await startWaiting(connectTutor);

    manager.disconnectUser("tutor-1");
    manager.releaseWaitingSockets("tutor", "tutor-1");

    expect(waiting.close).toHaveBeenCalledTimes(1);
    expect(waiting.close).toHaveBeenCalledWith(4001, "Token revoked");
  });

  it.each(pools)("should keep at most four waiting %s sockets", async (_kind, connect) => {
    const { waiting } = await startWaiting(connect);
    const later = [makeSocket(), makeSocket(), makeSocket(), makeSocket()];
    for (const [index, ws] of later.entries()) {
      await connect(ws, `/ws?token=t&tab=tab-${index}`);
    }

    expect(waiting.close).toHaveBeenCalledWith(4000, "Connection held by another tab");
    later.forEach((ws) => expect(ws.close).not.toHaveBeenCalled());
  });

  it.each(pools)(
    "should terminate a waiting %s socket that misses a pong and forget it",
    async (kind, connect, id) => {
      const { live, waiting } = await startWaiting(connect);

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      live.emit("pong");
      expect(waiting.ping).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

      expect(waiting.terminate).toHaveBeenCalled();
      expect(live.terminate).not.toHaveBeenCalled();
      manager.releaseWaitingSockets(kind, id);
      expect(waiting.close).not.toHaveBeenCalled();
    }
  );

  it.each(pools)(
    "should forget a waiting %s socket that closed on its own",
    async (kind, connect, id) => {
      const { waiting } = await startWaiting(connect);

      waiting.readyState = WebSocket.CLOSED;
      waiting.emit("close");
      manager.releaseWaitingSockets(kind, id);

      expect(waiting.close).not.toHaveBeenCalled();
    }
  );

  it.each(pools)(
    "should let the same %s tab replace its live socket instead of waiting",
    async (kind, connect, id) => {
      const live = makeSocket();
      const resumed = makeSocket();
      await connect(live);
      jest.mocked(hasActiveCall).mockReturnValue(true);

      await connect(resumed, "/ws?token=t&resume=1&tab=tab-a");

      expect(resumed.send).not.toHaveBeenCalledWith(WAITING);
      expect(manager.getConnection(kind, id)).toBe(resumed);
    }
  );
});
