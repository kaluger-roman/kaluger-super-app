import { EventEmitter } from "events";
import { createServer } from "http";
import { WebSocket } from "ws";

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

import { WebSocketManager } from "../WebSocketManager";

type StudentSocketStub = EventEmitter & {
  readyState: number;
  studentUserId?: string;
  email?: string;
  close: jest.Mock;
};

const makeStudentSocketStub = (readyState: number): StudentSocketStub => {
  const emitter = new EventEmitter() as StudentSocketStub;
  emitter.readyState = readyState;
  emitter.close = jest.fn();
  return emitter;
};

describe("WebSocketManager.handleStudentConnection lifecycle", () => {
  let server: ReturnType<typeof createServer>;
  let manager: WebSocketManager;

  beforeEach(() => {
    server = createServer();
    manager = new WebSocketManager(server);
  });

  afterEach((done) => {
    server.close(() => done());
  });

  const callHandler = (ws: StudentSocketStub): Promise<void> => {
    const handler = (
      manager as unknown as {
        handleStudentConnection: (ws: unknown, request: unknown) => Promise<void>;
      }
    ).handleStudentConnection.bind(manager);
    return handler(ws, {} as unknown);
  };

  it("регистрирует close-handler, который чистит запись при позднем close", async () => {
    const ws = makeStudentSocketStub(WebSocket.OPEN);

    await callHandler(ws);

    expect(manager.getConnectedStudents()).toContain("student-1");

    ws.emit("close");

    expect(manager.getConnectedStudents()).not.toContain("student-1");
  });

  it("не сохраняет запись-сироту, если socket закрылся до set", async () => {
    const ws = makeStudentSocketStub(WebSocket.CLOSED);

    await callHandler(ws);

    expect(manager.getConnectedStudents()).not.toContain("student-1");
  });

  it("очищает запись при error", async () => {
    const ws = makeStudentSocketStub(WebSocket.OPEN);

    await callHandler(ws);
    expect(manager.getConnectedStudents()).toContain("student-1");

    ws.emit("error", new Error("boom"));

    expect(manager.getConnectedStudents()).not.toContain("student-1");
  });

  it("не удаляет нового клиента при close прежнего ws-объекта того же пользователя", async () => {
    const firstWs = makeStudentSocketStub(WebSocket.OPEN);
    const secondWs = makeStudentSocketStub(WebSocket.OPEN);

    await callHandler(firstWs);
    await callHandler(secondWs);

    expect(manager.getConnectedStudents()).toContain("student-1");

    firstWs.emit("close");

    expect(manager.getConnectedStudents()).toContain("student-1");
  });
});
