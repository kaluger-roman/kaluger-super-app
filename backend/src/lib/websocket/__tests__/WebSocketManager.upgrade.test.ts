import { createServer } from "http";
import { AddressInfo } from "net";
import { WebSocket } from "ws";

jest.mock("../auth", () => ({
  authenticateWebSocket: jest.fn(async () => ({
    userId: "tutor-1",
    email: "tutor@example.com",
  })),
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

describe("WebSocketManager — upgrade routing", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let manager: WebSocketManager;

  const openWs = (path: string): Promise<WebSocket> =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${port}${path}?token=fake`
      );
      ws.once("open", () => resolve(ws));
      ws.once("error", reject);
    });

  beforeAll((done) => {
    server = createServer();
    manager = new WebSocketManager(server);
    server.listen(0, "127.0.0.1", () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => done());
  });

  it("accepts /ws upgrade", async () => {
    const ws = await openWs("/ws");
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("accepts /ws/student upgrade", async () => {
    const ws = await openWs("/ws/student");
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("accepts /ws and /ws/student in parallel — single HTTP server", async () => {
    const [tutorWs, studentWs] = await Promise.all([
      openWs("/ws"),
      openWs("/ws/student"),
    ]);
    expect(tutorWs.readyState).toBe(WebSocket.OPEN);
    expect(studentWs.readyState).toBe(WebSocket.OPEN);
    tutorWs.close();
    studentWs.close();
    expect(manager.getConnectedStudents()).not.toContain("tutor-1");
  });

  it("destroys socket on unknown WS path (no hung handshake)", async () => {
    await expect(openWs("/ws/unknown")).rejects.toThrow();
  });
});
