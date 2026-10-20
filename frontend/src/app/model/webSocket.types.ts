export type WebSocketClose = {
  // The token the socket used, when the server closed it for that token; null for any other close.
  revokedToken: string | null;
  // A newer tab or device of the same user took the connection over.
  replaced: boolean;
};

export type StudentWebSocketClose = {
  replaced: boolean;
};
