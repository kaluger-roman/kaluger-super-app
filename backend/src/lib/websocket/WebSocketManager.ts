import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import type {
  AuthenticatedStudentWebSocket,
  AuthenticatedWebSocket,
} from "./types";
import { authenticateWebSocket } from "./auth";
import { authenticateStudentWebSocket } from "./studentAuth";
import { handleMessage, sendWelcomeMessage } from "./messageHandler";
import type { StudentLessonWsEvent } from "../../types";

export class WebSocketManager {
  private wss: WebSocketServer;
  private studentWss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private studentClients: Map<string, AuthenticatedStudentWebSocket> =
    new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
    });
    this.wss.on("connection", this.handleConnection.bind(this));

    this.studentWss = new WebSocketServer({
      server,
      path: "/ws/student",
    });
    this.studentWss.on(
      "connection",
      this.handleStudentConnection.bind(this)
    );
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: any) {
    const decoded = await authenticateWebSocket(ws, request);
    if (!decoded) return;

    // Attach user info to WebSocket
    ws.userId = decoded.userId;
    ws.email = decoded.email;

    // If a previous connection exists for this user, close it before replacing.
    // The old socket's close-handler will fire later but won't affect the new one
    // because of the identity check below.
    const previous = this.clients.get(decoded.userId);
    if (previous && previous !== ws) {
      try {
        previous.close(4000, "Replaced by newer connection");
      } catch (error) {
        console.error("Error closing previous WebSocket:", error);
      }
    }

    // Store client connection
    this.clients.set(decoded.userId, ws);

    console.log(`WebSocket connected: ${decoded.email} (${decoded.userId})`);

    // Register handlers BEFORE sending welcome message — if send throws
    // synchronously (socket already closing), the close/error handlers must
    // be in place to clean up the entry in `clients`.
    ws.on("close", () => {
      console.log(
        `WebSocket disconnected: ${decoded.email} (${decoded.userId})`
      );
      if (this.clients.get(decoded.userId) === ws) {
        this.clients.delete(decoded.userId);
      }
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${decoded.userId}:`, error);
      if (this.clients.get(decoded.userId) === ws) {
        this.clients.delete(decoded.userId);
      }
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    // Send welcome message only if socket is still open; guard against
    // synchronous throw from ws.send when socket closed during handshake.
    if (ws.readyState === WebSocket.OPEN) {
      try {
        sendWelcomeMessage(ws, decoded.userId);
      } catch (error) {
        console.error("Failed to send welcome message:", error);
      }
    }
  }

  private async handleStudentConnection(
    ws: AuthenticatedStudentWebSocket,
    request: any
  ) {
    const decoded = await authenticateStudentWebSocket(ws, request);
    if (!decoded) return;

    ws.studentUserId = decoded.studentUserId;
    ws.email = decoded.email;

    const previous = this.studentClients.get(decoded.studentUserId);
    if (previous && previous !== ws) {
      try {
        previous.close(4000, "Replaced by newer connection");
      } catch (error) {
        console.error(
          "Error closing previous student WebSocket:",
          error
        );
      }
    }

    this.studentClients.set(decoded.studentUserId, ws);

    console.log(
      `Student WebSocket connected: ${decoded.email} (${decoded.studentUserId})`
    );

    ws.on("close", () => {
      console.log(
        `Student WebSocket disconnected: ${decoded.email} (${decoded.studentUserId})`
      );
      if (this.studentClients.get(decoded.studentUserId) === ws) {
        this.studentClients.delete(decoded.studentUserId);
      }
    });

    ws.on("error", (error) => {
      console.error(
        `Student WebSocket error for ${decoded.studentUserId}:`,
        error
      );
      if (this.studentClients.get(decoded.studentUserId) === ws) {
        this.studentClients.delete(decoded.studentUserId);
      }
    });

    // Students do not send messages in MVP — silently ignore any inbound.
    ws.on("message", () => {});
  }

  // Method to broadcast lesson status changes to all connected clients
  public broadcastLessonStatusUpdate(
    lessonId: string,
    status: string,
    tutorId?: string,
    studentUserId?: string | null
  ) {
    const message = JSON.stringify({
      type: "lesson_status_updated",
      lessonId,
      status,
    });

    // Если указан tutorId, отправляем только ему, иначе всем
    if (tutorId) {
      this.sendToUser(tutorId, {
        type: "lesson_status_updated",
        lessonId,
        status,
      });
    } else {
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }

    if (studentUserId) {
      this.sendToStudent(studentUserId, {
        type: "lesson_status_updated",
        lessonId,
        status,
      });
    }

    console.log(
      `Broadcasted lesson status update (${status}) for lesson ${lessonId} to ${
        tutorId ? "1 tutor" : this.clients.size + " tutors"
      }${studentUserId ? " + 1 student" : ""}`
    );
  }

  // Send a typed lesson event to a specific student (used for create/update/delete)
  public broadcastStudentLessonEvent(
    studentUserId: string,
    event: StudentLessonWsEvent
  ): boolean {
    return this.sendToStudent(studentUserId, event);
  }

  // Method to send message to specific user
  public sendToUser(userId: string, message: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public sendToStudent(studentUserId: string, message: any): boolean {
    const client = this.studentClients.get(studentUserId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Method to get connected users count
  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  // Method to get connected users
  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public getConnectedStudentsCount(): number {
    return this.studentClients.size;
  }

  public getConnectedStudents(): string[] {
    return Array.from(this.studentClients.keys());
  }
}
