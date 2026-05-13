import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import {
  getCachedTokenVersion,
  setCachedTokenVersion,
} from "../lib/tokenVersionCache";
import type { JwtPayload } from "../types";
import { verifyToken } from "../utils/auth";
import { isValidTimezone } from "../utils/time";

export type AuthRequest = Request & {
  user?: JwtPayload;
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Токен доступа обязателен" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res
      .status(401)
      .json({ error: "Недействительный или истекший токен" });
  }

  // Verify tokenVersion so password/email changes immediately revoke
  // previously issued tokens. Short-lived in-process cache amortizes the
  // per-request DB roundtrip; services that bump tokenVersion populate it
  // with the fresh value so the next JWT passes without a refetch.
  const tokenVersion = payload.tokenVersion ?? 0;
  const cached = getCachedTokenVersion(payload.userId);

  if (cached !== undefined) {
    if (tokenVersion !== cached) {
      return res.status(401).json({ error: "Токен отозван" });
    }
  } else {
    let dbUser;
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { tokenVersion: true },
      });
    } catch (error) {
      console.error("Auth middleware DB error:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }

    if (!dbUser) {
      return res.status(401).json({ error: "Токен отозван" });
    }

    if (tokenVersion !== dbUser.tokenVersion) {
      return res.status(401).json({ error: "Токен отозван" });
    }

    setCachedTokenVersion(payload.userId, dbUser.tokenVersion);
  }

  req.user = payload;

  // Silently save client timezone from header (only when valid IANA value to
  // protect downstream Date.toLocaleTimeString from RangeError)
  const timezone = req.headers["x-timezone"] as string | undefined;
  if (timezone && payload.userId && isValidTimezone(timezone)) {
    prisma.user.update({
      where: { id: payload.userId },
      data: { timezone },
    }).catch(() => {
      // Non-critical, ignore errors
    });
  }

  next();
};
