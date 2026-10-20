import { EventEmitter } from "events";
import { createServer } from "http";
import { WebSocket } from "ws";

import { authenticateWebSocket } from "../auth";
import { handleMessage } from "../messageHandler";
import {
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

  const connectStudent = (ws: SocketStub) =>
    (manager as unknown as ConnectionHandlers).handleStudentConnection.call(manager, ws, {});
  const connectTutor = (ws: SocketStub) =>
    (manager as unknown as ConnectionHandlers).handleConnection.call(manager, ws, {});

  beforeEach(() => {
    jest.clearAllMocks();
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
