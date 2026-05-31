import type { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import {
  getCachedStudentTokenVersion,
  setCachedStudentTokenVersion,
} from "../lib/studentTokenVersionCache";
import type { StudentRequest } from "../types";
import { verifyStudentToken } from "../utils/studentAuth";

export const authenticateStudent = async (
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

  const tokenVersion = payload.tokenVersion ?? 0;
  const cached = getCachedStudentTokenVersion(payload.studentUserId);

  if (cached !== undefined) {
    if (tokenVersion !== cached) {
      return res.status(401).json({ error: "Токен отозван" });
    }
  } else {
    let dbStudent;
    try {
      dbStudent = await prisma.studentUser.findUnique({
        where: { id: payload.studentUserId },
        select: { tokenVersion: true },
      });
    } catch (error) {
      console.error("Student auth middleware DB error:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }

    if (!dbStudent) {
      return res.status(401).json({ error: "Токен отозван" });
    }

    if (tokenVersion !== dbStudent.tokenVersion) {
      return res.status(401).json({ error: "Токен отозван" });
    }

    setCachedStudentTokenVersion(payload.studentUserId, dbStudent.tokenVersion);
  }

  req.studentUser = payload;
  next();
};
