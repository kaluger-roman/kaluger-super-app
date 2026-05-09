import { parse } from "url";
import { verifyToken } from "../../utils/auth";
import { AuthenticatedWebSocket } from "./types";

export const authenticateWebSocket = async (
  ws: AuthenticatedWebSocket,
  request: any
): Promise<{ userId: string; email: string } | null> => {
  try {
    // Extract token from query parameters
    const { query } = parse(request.url || "", true);
    const token = query.token as string;

    if (!token) {
      console.log("WebSocket connection rejected: No token provided");
      ws.close(1008, "No token provided");
      return null;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      ws.close(1008, "Authentication failed");
      return null;
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    ws.close(1008, "Authentication failed");
    return null;
  }
};
