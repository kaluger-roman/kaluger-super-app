import type { Response, NextFunction } from "express";
import type { AdminRequest } from "../types";
import { verifyAdminToken } from "../utils/auth";

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

  const payload = verifyAdminToken(token);
  if (!payload) {
    return res
      .status(403)
      .json({ error: "Недействительный или истекший токен" });
  }

  req.admin = payload;
  next();
};
