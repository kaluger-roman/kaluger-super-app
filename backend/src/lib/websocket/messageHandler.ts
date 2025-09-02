import { AuthenticatedWebSocket } from "./types";

export const handleMessage = (ws: AuthenticatedWebSocket, data: any) => {
  // Handle different message types here
  console.log(`Received message from ${ws.userId}:`, data);

  // Echo back for now (you can implement specific handlers)
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
