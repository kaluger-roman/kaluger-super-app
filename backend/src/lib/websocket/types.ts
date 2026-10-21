import type { WebSocket } from "ws";

export type TabSocket = WebSocket & {
  tabId?: string;
};

export type AuthenticatedWebSocket = TabSocket & {
  userId?: string;
  email?: string;
};

export type AuthenticatedStudentWebSocket = TabSocket & {
  studentUserId?: string;
  email?: string;
};

export type TakeoverRefusal = {
  code: number;
  reason: string;
};
