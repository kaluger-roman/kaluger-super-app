import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { parse } from "url";

export type AuthenticatedWebSocket = WebSocket & {
  userId?: string;
  email?: string;
};

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
    try {
      // Extract token from query parameters
      const { query } = parse(request.url || "", true);
      const token = query.token as string;

      if (!token) {
        console.log("WebSocket connection rejected: No token provided");
        ws.close(1008, "No token provided");
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      ) as {
        userId: string;
        email: string;
      };

      // Attach user info to WebSocket
      ws.userId = decoded.userId;
      ws.email = decoded.email;

      // Store client connection
      this.clients.set(decoded.userId, ws);

      console.log(`WebSocket connected: ${decoded.email} (${decoded.userId})`);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connection_established",
          message: "WebSocket connection established",
          userId: decoded.userId,
        })
      );

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
          this.handleMessage(ws, data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      ws.close(1008, "Authentication failed");
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: any) {
    // Handle different message types here
    console.log(`Received message from ${ws.userId}:`, data);

    // Echo back for now (you can implement specific handlers)
    ws.send(
      JSON.stringify({
        type: "message_received",
        originalMessage: data,
      })
    );
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
