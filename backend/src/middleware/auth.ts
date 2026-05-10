import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import type { JwtPayload } from "../types";
import { verifyToken } from "../utils/auth";
import { isValidTimezone } from "../utils/time";

export type AuthRequest = Request & {
  user?: JwtPayload;
};

export const authenticateToken = (
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
