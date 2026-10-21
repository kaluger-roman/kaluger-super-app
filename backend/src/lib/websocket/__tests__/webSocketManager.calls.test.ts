import { EventEmitter } from "events";
import { createServer } from "http";
import { WebSocket } from "ws";

import { authenticateWebSocket } from "../auth";
import { handleMessage } from "../messageHandler";
import {
  hasActiveCall,
  processCallSignal,
  terminateActiveCallForParticipant,
} from "../../../services/callSignaling";
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
  terminate: jest.Mock;
};

const makeSocket = (): SocketStub => {
  const emitter = new EventEmitter() as SocketStub;
  emitter.readyState = WebSocket.OPEN;
  emitter.close = jest.fn();
  emitter.send = jest.fn();
  emitter.terminate = jest.fn();
  return emitter;
};

const inviteMessage = Buffer.from(JSON.stringify({ type: "call_invite", inviteId: "invite-1" }));

type ConnectionHandlers = {
  handleConnection: (ws: unknown, request: unknown) => Promise<void>;
  handleStudentConnection: (ws: unknown, request: unknown) => Promise<void>;
};

describe("WebSocketManager call lifecycle", () => {
  let server: ReturnType<typeof createServer>;
  let manager: WebSocketManager;

  const connectStudent = (ws: SocketStub, request: { url?: string } = {}) =>
    (manager as unknown as ConnectionHandlers).handleStudentConnection.call(manager, ws, request);
  const connectTutor = (ws: SocketStub, request: { url?: string } = {}) =>
    (manager as unknown as ConnectionHandlers).handleConnection.call(manager, ws, request);
  const resumeRequest = { url: "/ws?token=t&resume=1" };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasActiveCall).mockReturnValue(false);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    (authenticateWebSocket as jest.Mock).mockResolvedValue({ userId: "tutor-1", email: "t@e.com" });
    server = createServer();
    manager = new WebSocketManager(server);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should end the student's call once when the socket errors and then closes", async () => {
    const ws = makeSocket();
    await connectStudent(ws);

    ws.emit("error", new Error("boom"));
    ws.emit("close");

    expect(terminateActiveCallForParticipant).toHaveBeenCalledTimes(1);
    expect(terminateActiveCallForParticipant).toHaveBeenCalledWith("student", "student-1");
  });

  it("should end the tutor's call when the tutor socket errors", async () => {
    const ws = makeSocket();
    await connectTutor(ws);

    ws.emit("error", new Error("boom"));

    expect(terminateActiveCallForParticipant).toHaveBeenCalledWith("tutor", "tutor-1");
  });

  it("should end the call of a replaced student socket but not on its late close", async () => {
    const first = makeSocket();
    const second = makeSocket();
    await connectStudent(first);

    await connectStudent(second);
    first.emit("close");

    expect(terminateActiveCallForParticipant).toHaveBeenCalledTimes(1);
    expect(manager.getConnectedStudents()).toContain("student-1");
  });

  it("should route student socket messages to the call flow", async () => {
    const ws = makeSocket();
    await connectStudent(ws);

    ws.emit("message", inviteMessage);

    expect(processCallSignal).toHaveBeenCalledWith(
      { kind: "student", id: "student-1" },
      { type: "call_invite", inviteId: "invite-1" }
    );
  });

  it("should revoke the tutor socket at once even if the client never completes the close", async () => {
    const ws = makeSocket();
    await connectTutor(ws);
    jest.useFakeTimers();

    try {
      manager.disconnectUser("tutor-1");

      expect(ws.close).toHaveBeenCalledWith(4001, "Token revoked");
      expect(terminateActiveCallForParticipant).toHaveBeenCalledWith("tutor", "tutor-1");
      expect(manager.getConnection("tutor", "tutor-1")).toBeUndefined();

      ws.emit("message", inviteMessage);
      expect(handleMessage).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(ws.terminate).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("should end the revoked socket's call only once when it closes later", async () => {
    const ws = makeSocket();
    await connectTutor(ws);

    manager.disconnectUser("tutor-1");
    ws.emit("close");

    expect(terminateActiveCallForParticipant).toHaveBeenCalledTimes(1);
  });

  it.each([["tutor", connectTutor] as const, ["student", connectStudent] as const])(
    "should keep the live %s socket when another tab reconnects automatically",
    async (kind, connect) => {
      const live = makeSocket();
      const resumed = makeSocket();
      await connect(live);

      await connect(resumed, resumeRequest);

      expect(resumed.close).toHaveBeenCalledWith(4000, "Connection held by another tab");
      expect(live.close).not.toHaveBeenCalled();
      expect(terminateActiveCallForParticipant).not.toHaveBeenCalled();
      const id = kind === "tutor" ? "tutor-1" : "student-1";
      expect(manager.getConnection(kind, id)).toBe(live);
      live.emit("message", inviteMessage);
      const routed = kind === "tutor" ? handleMessage : processCallSignal;
      expect(routed).toHaveBeenCalled();
    }
  );

  it.each([["tutor", connectTutor] as const, ["student", connectStudent] as const])(
    "should register an automatic %s reconnect when no tab holds the connection",
    async (kind, connect) => {
      const stale = makeSocket();
      await connect(stale);
      stale.readyState = WebSocket.CLOSED;
      const resumed = makeSocket();

      await connect(resumed, resumeRequest);

      expect(resumed.close).not.toHaveBeenCalled();
      expect(manager.getConnection(kind, kind === "tutor" ? "tutor-1" : "student-1")).toBe(resumed);
    }
  );

  it.each([["tutor", connectTutor] as const, ["student", connectStudent] as const])(
    "should keep the live %s socket and its call when another tab opens during the call",
    async (kind, connect) => {
      const live = makeSocket();
      const fresh = makeSocket();
      await connect(live);
      jest.mocked(hasActiveCall).mockReturnValue(true);

      await connect(fresh, { url: "/ws?token=t" });

      const id = kind === "tutor" ? "tutor-1" : "student-1";
      expect(hasActiveCall).toHaveBeenCalledWith(kind, id);
      expect(fresh.close).toHaveBeenCalledWith(4002, "Call in progress in another tab");
      expect(live.close).not.toHaveBeenCalled();
      expect(terminateActiveCallForParticipant).not.toHaveBeenCalled();
      expect(manager.getConnection(kind, id)).toBe(live);
      live.emit("message", inviteMessage);
      const routed = kind === "tutor" ? handleMessage : processCallSignal;
      expect(routed).toHaveBeenCalled();
    }
  );

  it.each([["tutor", connectTutor] as const, ["student", connectStudent] as const])(
    "should let a fresh %s tab take over once the call has ended",
    async (kind, connect) => {
      const live = makeSocket();
      const fresh = makeSocket();
      await connect(live);
      jest.mocked(hasActiveCall).mockReturnValue(true);
      await connect(makeSocket(), { url: "/ws?token=t" });
      jest.mocked(hasActiveCall).mockReturnValue(false);

      await connect(fresh, { url: "/ws?token=t" });

      expect(live.close).toHaveBeenCalledWith(4000, "Replaced by newer connection");
      expect(manager.getConnection(kind, kind === "tutor" ? "tutor-1" : "student-1")).toBe(fresh);
    }
  );

  it("should still replace the live socket on a fresh connect", async () => {
    const live = makeSocket();
    const fresh = makeSocket();
    await connectTutor(live);

    await connectTutor(fresh, { url: "/ws?token=t" });

    expect(live.close).toHaveBeenCalledWith(4000, "Replaced by newer connection");
    expect(manager.getConnection("tutor", "tutor-1")).toBe(fresh);
  });

  it("should ignore messages from a replaced student socket", async () => {
    const first = makeSocket();
    await connectStudent(first);
    await connectStudent(makeSocket());

    first.emit("message", inviteMessage);

    expect(processCallSignal).not.toHaveBeenCalled();
  });

  it("should look up and message a participant by kind", async () => {
    const tutor = makeSocket();
    const student = makeSocket();
    await connectTutor(tutor);
    await connectStudent(student);

    expect(manager.getConnection("tutor", "tutor-1")).toBe(tutor);
    expect(manager.getConnection("student", "student-1")).toBe(student);
    expect(manager.getConnection("student", "nobody")).toBeUndefined();
    expect(manager.sendToParticipant("student", "student-1", { type: "call_busy" })).toBe(true);
    expect(student.send).toHaveBeenCalledWith(JSON.stringify({ type: "call_busy" }));
    expect(manager.sendToParticipant("tutor", "nobody", { type: "call_busy" })).toBe(false);
  });
});
