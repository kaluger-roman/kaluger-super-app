import { parse } from "url";
import type { IncomingMessage } from "http";
import { prisma } from "../prisma";
import { getCachedTokenVersion, setCachedTokenVersion } from "../tokenVersionCache";
import { verifyToken } from "../../utils/auth";
import type { AuthenticatedWebSocket } from "./types";

export const authenticateWebSocket = async (
  ws: AuthenticatedWebSocket,
  request: IncomingMessage
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

    // Same revocation check as authenticateToken: the socket carries calls, not just updates.
    const tokenVersion = decoded.tokenVersion ?? 0;
    const cached = getCachedTokenVersion(decoded.userId);

    if (cached !== undefined) {
      if (tokenVersion !== cached) {
        ws.close(1008, "Token revoked");
        return null;
      }
    } else {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { tokenVersion: true },
      });

      if (!dbUser || tokenVersion !== dbUser.tokenVersion) {
        ws.close(1008, "Token revoked");
        return null;
      }

      setCachedTokenVersion(decoded.userId, dbUser.tokenVersion);
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    ws.close(1008, "Authentication failed");
    return null;
  }
};
