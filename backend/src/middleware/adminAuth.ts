import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AdminJwtPayload } from "../types";

export type AdminRequest = Request & {
  admin?: AdminJwtPayload;
};

export const generateAdminToken = (email: string): string => {
  const secret =
    process.env.JWT_SECRET || "fallback-secret-key-jdjdjjdjdjdjdiiiipq";
  return jwt.sign({ email, isAdmin: true } as AdminJwtPayload, secret, {
    expiresIn: "24h",
  });
};

export const authenticateAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Токен доступа обязателен" });
  }

  try {
    const secret =
      process.env.JWT_SECRET || "fallback-secret-key-jdjdjjdjdjdjdiiiipq";
    const payload = jwt.verify(token, secret) as AdminJwtPayload;

    if (!payload.isAdmin) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    req.admin = payload;
    next();
  } catch {
    return res
      .status(403)
      .json({ error: "Недействительный или истекший токен" });
  }
};
