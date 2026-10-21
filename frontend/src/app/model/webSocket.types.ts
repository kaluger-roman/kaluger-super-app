// Why another tab or device holds the connection: a newer tab took it, or it is in a call.
export type ElsewhereReason = "tab" | "call";

export type WebSocketClose = {
  // The token the socket used, when the server closed it for that token; null for any other close.
  revokedToken: string | null;
  elsewhere: ElsewhereReason | null;
};

export type LessonStatusUpdate = {
  lessonId: string;
  status: string;
};
