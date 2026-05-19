import type { Response } from "express";

import { getStudentLessonsByWeek } from "../services/studentCabinet";
import type { StudentRequest } from "../types";

export const studentCabinetGetLessons = async (
  req: StudentRequest,
  res: Response
) => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const weekStartRaw = req.query.weekStart;
    if (weekStartRaw !== undefined && typeof weekStartRaw !== "string") {
      return res.status(400).json({ error: "Параметр weekStart некорректен" });
    }

    const data = await getStudentLessonsByWeek(studentUserId, weekStartRaw);
    return res.json(data);
  } catch (error) {
    console.error("Student cabinet getLessons error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
