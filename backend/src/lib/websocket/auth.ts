import jwt from "jsonwebtoken";
import { parse } from "url";
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

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as {
      userId: string;
      email: string;
    };

    return decoded;
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    ws.close(1008, "Authentication failed");
    return null;
  }
};
