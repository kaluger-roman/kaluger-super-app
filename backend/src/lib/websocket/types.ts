import { WebSocket } from "ws";

export type AuthenticatedWebSocket = WebSocket & {
  userId?: string;
  email?: string;
};

export type AuthenticatedStudentWebSocket = WebSocket & {
  studentUserId?: string;
  email?: string;
};
