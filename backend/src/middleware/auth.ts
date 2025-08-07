import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { JwtPayload } from "../types";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

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
      .status(403)
      .json({ error: "Недействительный или истекший токен" });
  }

  req.user = payload;
  next();
};
