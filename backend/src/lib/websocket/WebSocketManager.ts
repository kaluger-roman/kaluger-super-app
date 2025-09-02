import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { AuthenticatedWebSocket } from "./types";
import { authenticateWebSocket } from "./auth";
import { handleMessage, sendWelcomeMessage } from "./messageHandler";

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
    });

    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: any) {
    const decoded = await authenticateWebSocket(ws, request);
    if (!decoded) return;

    // Attach user info to WebSocket
    ws.userId = decoded.userId;
    ws.email = decoded.email;

    // Store client connection
    this.clients.set(decoded.userId, ws);

    console.log(`WebSocket connected: ${decoded.email} (${decoded.userId})`);

    // Send welcome message
    sendWelcomeMessage(ws, decoded.userId);

    // Handle disconnection
    ws.on("close", () => {
      console.log(
        `WebSocket disconnected: ${decoded.email} (${decoded.userId})`
      );
      this.clients.delete(decoded.userId);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${decoded.userId}:`, error);
      this.clients.delete(decoded.userId);
    });

    // Handle incoming messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
  }

  // Method to broadcast lesson status changes to all connected clients
  public broadcastLessonStatusUpdate(
    lessonId: string,
    status: string,
    tutorId?: string
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
      this.clients.forEach((client, userId) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }

    console.log(
      `Broadcasted lesson status update (${status}) for lesson ${lessonId} to ${
        tutorId ? "1 user" : this.clients.size + " clients"
      }`
    );
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

  // Method to get connected users count
  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  // Method to get connected users
  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }
}
