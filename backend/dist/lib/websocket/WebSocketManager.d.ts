import { Server } from "http";
export declare class WebSocketManager {
    private wss;
    private clients;
    constructor(server: Server);
    private handleConnection;
    broadcastLessonStatusUpdate(lessonId: string, status: string, tutorId?: string): void;
    sendToUser(userId: string, message: any): boolean;
    getConnectedUsersCount(): number;
    getConnectedUsers(): string[];
}
//# sourceMappingURL=WebSocketManager.d.ts.map