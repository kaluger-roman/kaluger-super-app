import { EventEmitter } from "events";
import { createServer } from "http";
import { WebSocket } from "ws";

import { authenticateWebSocket } from "../auth";
import { handleCallSignal, terminateActiveCallForParticipant } from "../signaling";
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

jest.mock("../signaling", () => ({
  handleCallSignal: jest.fn(async () => undefined),
  terminateActiveCallForParticipant: jest.fn(async () => undefined),
}));

type SocketStub = EventEmitter & { readyState: number; close: jest.Mock; send: jest.Mock };

const makeSocket = (): SocketStub => {
  const emitter = new EventEmitter() as SocketStub;
  emitter.readyState = WebSocket.OPEN;
  emitter.close = jest.fn();
  emitter.send = jest.fn();
  return emitter;
};

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

  it("should route student socket messages to handleCallSignal", async () => {
    const ws = makeSocket();
    await connectStudent(ws);

    ws.emit("message", Buffer.from(JSON.stringify({ type: "call_invite" })));

    expect(handleCallSignal).toHaveBeenCalledWith("student", "student-1", { type: "call_invite" });
  });
});
