import { WebSocket } from "ws";
import { AuthenticatedWebSocket } from "./types";

export const handleMessage = (
  ws: AuthenticatedWebSocket,
  data: unknown
): void => {
  console.log(`Received message from ${ws.userId}:`, data);

  // Skip the echo when the socket has already started closing — `ws.send`
  // would throw synchronously on a non-OPEN readyState and the surrounding
  // catch in WebSocketManager would log it as a "parsing" error, hiding the
  // real cause and aborting any future side-effects of this handler.
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "message_received",
      originalMessage: data,
    })
  );
};

export const sendWelcomeMessage = (
  ws: AuthenticatedWebSocket,
  userId: string
) => {
  ws.send(
    JSON.stringify({
      type: "connection_established",
      message: "WebSocket connection established",
      userId,
    })
  );
};
