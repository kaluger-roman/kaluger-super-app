import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth";
import type { StudentRequest } from "../../types";
import {
  getCallHistoryForStudent,
  getCallHistoryForTutor,
} from "../../services";
import { parseHistoryQuery } from "./getCallHistory.helpers";

export const getTutorCallHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tutorUserId = req.user?.userId;
    if (!tutorUserId) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    const items = await getCallHistoryForTutor(
      tutorUserId,
      parseHistoryQuery(req.query)
    );
    res.json({ items });
  } catch (error) {
    console.error("Get tutor call history error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getStudentCallHistory = async (
  req: StudentRequest,
  res: Response
): Promise<void> => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    const items = await getCallHistoryForStudent(
      studentUserId,
      parseHistoryQuery(req.query)
    );
    res.json({ items });
  } catch (error) {
    console.error("Get student call history error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
