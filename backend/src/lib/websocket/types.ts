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

export type TakeoverDecision =
  | { action: "register" }
  // The user's call goes on in another tab: keep the socket unregistered until it ends.
  | { action: "wait" }
  | { action: "refuse"; code: number; reason: string };

// Why the sockets waiting for a call in another tab are let go.
export type WaitingReleaseReason = "call_ended" | "holder_gone";
