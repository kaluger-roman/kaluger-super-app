import { createServer } from "http";
import { WebSocket } from "ws";

import { WebSocketManager } from "../WebSocketManager";

type MockSocket = {
  readyState: number;
  send: jest.Mock;
  close: jest.Mock;
};

const makeMockSocket = (open = true): MockSocket => ({
  readyState: open ? WebSocket.OPEN : WebSocket.CLOSED,
  send: jest.fn(),
  close: jest.fn(),
});

const injectStudent = (
  manager: WebSocketManager,
  studentUserId: string,
  socket: MockSocket
) => {
  // The studentClients Map is private — controlled access for tests only.
  const internalMap = (
    manager as unknown as {
      studentClients: Map<string, unknown>;
    }
  ).studentClients;
  internalMap.set(studentUserId, socket);
};

const injectTutor = (
  manager: WebSocketManager,
  userId: string,
  socket: MockSocket
) => {
  const internalMap = (
    manager as unknown as { clients: Map<string, unknown> }
  ).clients;
  internalMap.set(userId, socket);
};

describe("WebSocketManager — student broadcasts", () => {
  let server: ReturnType<typeof createServer>;
  let manager: WebSocketManager;

  beforeEach(() => {
    server = createServer();
    manager = new WebSocketManager(server);
  });

  afterEach((done) => {
    server.close(() => done());
  });

  it("sendToStudent delivers JSON-serialized payload to the right pool only", () => {
    const studentSocket = makeMockSocket();
    const tutorSocket = makeMockSocket();
    injectStudent(manager, "student-1", studentSocket);
    injectTutor(manager, "tutor-1", tutorSocket);

    const ok = manager.sendToStudent("student-1", {
      type: "lesson_deleted",
      lessonId: "l-1",
    });

    expect(ok).toBe(true);
    expect(studentSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "lesson_deleted", lessonId: "l-1" })
    );
    // Tutor pool must NOT receive student-targeted events.
    expect(tutorSocket.send).not.toHaveBeenCalled();
  });

  it("sendToStudent returns false when the student is not connected", () => {
    const ok = manager.sendToStudent("ghost-id", {
      type: "lesson_deleted",
      lessonId: "l-1",
    });
    expect(ok).toBe(false);
  });

  it("sendToStudent returns false when socket is not OPEN", () => {
    const closedSocket = makeMockSocket(false);
    injectStudent(manager, "student-1", closedSocket);

    const ok = manager.sendToStudent("student-1", {
      type: "lesson_deleted",
      lessonId: "l-1",
    });
    expect(ok).toBe(false);
    expect(closedSocket.send).not.toHaveBeenCalled();
  });

  it("broadcastStudentLessonEvent serializes typed events", () => {
    const studentSocket = makeMockSocket();
    injectStudent(manager, "student-1", studentSocket);

    manager.broadcastStudentLessonEvent("student-1", {
      type: "lesson_status_updated",
      lessonId: "l-1",
      status: "COMPLETED",
    });

    expect(studentSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "lesson_status_updated",
        lessonId: "l-1",
        status: "COMPLETED",
      })
    );
  });

  it("broadcastLessonStatusUpdate fans out to both tutor and student when both are provided", () => {
    const studentSocket = makeMockSocket();
    const tutorSocket = makeMockSocket();
    injectStudent(manager, "student-1", studentSocket);
    injectTutor(manager, "tutor-1", tutorSocket);

    manager.broadcastLessonStatusUpdate(
      "l-1",
      "IN_PROGRESS",
      "tutor-1",
      "student-1"
    );

    expect(tutorSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "lesson_status_updated",
        lessonId: "l-1",
        status: "IN_PROGRESS",
      })
    );
    expect(studentSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "lesson_status_updated",
        lessonId: "l-1",
        status: "IN_PROGRESS",
      })
    );
  });

  it("broadcastLessonStatusUpdate ignores undefined studentUserId (back-compat with tutor-only callers)", () => {
    const tutorSocket = makeMockSocket();
    injectTutor(manager, "tutor-1", tutorSocket);

    manager.broadcastLessonStatusUpdate("l-1", "SCHEDULED", "tutor-1");

    expect(tutorSocket.send).toHaveBeenCalled();
    expect(manager.getConnectedStudentsCount()).toBe(0);
  });

  it("does not throw when studentClients pool is empty", () => {
    expect(() =>
      manager.broadcastStudentLessonEvent("student-1", {
        type: "lesson_deleted",
        lessonId: "l-1",
      })
    ).not.toThrow();
  });

  it("exposes student pool size and ids via getters", () => {
    injectStudent(manager, "student-a", makeMockSocket());
    injectStudent(manager, "student-b", makeMockSocket());
    expect(manager.getConnectedStudentsCount()).toBe(2);
    expect(manager.getConnectedStudents().sort()).toEqual([
      "student-a",
      "student-b",
    ]);
  });
});
