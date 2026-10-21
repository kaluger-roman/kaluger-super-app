// Why another tab or device holds the connection: a newer tab took it, or it is in a call.
export type ElsewhereReason = "tab" | "call";

export type WebSocketClose = {
  // The token the socket used, when the server closed it for that token; null for any other close.
  revokedToken: string | null;
  elsewhere: ElsewhereReason | null;
  // The call that held the connection in another tab is over: the connection may be free now.
  callEnded: boolean;
};

export type LessonStatusUpdate = {
  lessonId: string;
  status: string;
};
