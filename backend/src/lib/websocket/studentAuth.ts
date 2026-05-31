import { parse } from "url";
import prisma from "../prisma";
import {
  getCachedStudentTokenVersion,
  setCachedStudentTokenVersion,
} from "../studentTokenVersionCache";
import { verifyStudentToken } from "../../utils/studentAuth";
import type { AuthenticatedStudentWebSocket } from "./types";

export const authenticateStudentWebSocket = async (
  ws: AuthenticatedStudentWebSocket,
  request: { url?: string }
): Promise<{ studentUserId: string; email: string } | null> => {
  try {
    const { query } = parse(request.url || "", true);
    const token = query.token as string;

    if (!token) {
      ws.close(1008, "No token provided");
      return null;
    }

    const decoded = verifyStudentToken(token);
    if (!decoded) {
      ws.close(1008, "Authentication failed");
      return null;
    }

    const tokenVersion = decoded.tokenVersion ?? 0;
    const cached = getCachedStudentTokenVersion(decoded.studentUserId);

    if (cached !== undefined) {
      if (tokenVersion !== cached) {
        ws.close(1008, "Token revoked");
        return null;
      }
    } else {
      const dbStudent = await prisma.studentUser.findUnique({
        where: { id: decoded.studentUserId },
        select: { tokenVersion: true },
      });

      if (!dbStudent || tokenVersion !== dbStudent.tokenVersion) {
        ws.close(1008, "Token revoked");
        return null;
      }

      setCachedStudentTokenVersion(decoded.studentUserId, dbStudent.tokenVersion);
    }

    return { studentUserId: decoded.studentUserId, email: decoded.email };
  } catch (error) {
    console.error("Student WebSocket authentication error:", error);
    ws.close(1008, "Authentication failed");
    return null;
  }
};
