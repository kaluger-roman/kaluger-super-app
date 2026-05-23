import type { Response, NextFunction } from "express";
import type { StudentRequest } from "../types";
import { verifyStudentToken } from "../utils/studentAuth";

export const authenticateStudent = (
  req: StudentRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Токен доступа обязателен" });
  }

  const payload = verifyStudentToken(token);
  if (!payload) {
    return res
      .status(401)
      .json({ error: "Недействительный или истекший токен" });
  }

  req.studentUser = payload;
  next();
};
