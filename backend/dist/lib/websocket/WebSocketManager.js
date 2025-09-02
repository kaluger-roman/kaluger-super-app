"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const ws_1 = require("ws");
const auth_1 = require("./auth");
const messageHandler_1 = require("./messageHandler");
class WebSocketManager {
    wss;
    clients = new Map();
    constructor(server) {
        this.wss = new ws_1.WebSocketServer({
            server,
            path: "/ws",
        });
        this.wss.on("connection", this.handleConnection.bind(this));
    }
    async handleConnection(ws, request) {
        const decoded = await (0, auth_1.authenticateWebSocket)(ws, request);
        if (!decoded)
            return;
        // Attach user info to WebSocket
        ws.userId = decoded.userId;
        ws.email = decoded.email;
        // Store client connection
        this.clients.set(decoded.userId, ws);
        console.log(`WebSocket connected: ${decoded.email} (${decoded.userId})`);
        // Send welcome message
        (0, messageHandler_1.sendWelcomeMessage)(ws, decoded.userId);
        // Handle disconnection
        ws.on("close", () => {
            console.log(`WebSocket disconnected: ${decoded.email} (${decoded.userId})`);
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
                (0, messageHandler_1.handleMessage)(ws, data);
            }
            catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        });
    }
    // Method to broadcast lesson status changes to all connected clients
    broadcastLessonStatusUpdate(lessonId, status, tutorId) {
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
        }
        else {
            this.clients.forEach((client, userId) => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
        console.log(`Broadcasted lesson status update (${status}) for lesson ${lessonId} to ${tutorId ? "1 user" : this.clients.size + " clients"}`);
    }
    // Method to send message to specific user
    sendToUser(userId, message) {
        const client = this.clients.get(userId);
        if (client && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
    // Method to get connected users count
    getConnectedUsersCount() {
        return this.clients.size;
    }
    // Method to get connected users
    getConnectedUsers() {
        return Array.from(this.clients.keys());
    }
}
exports.WebSocketManager = WebSocketManager;
//# sourceMappingURL=WebSocketManager.js.map