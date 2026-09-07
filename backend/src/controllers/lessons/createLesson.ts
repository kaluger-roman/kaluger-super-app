import type { Response } from "express";
import type { Student } from "@prisma/client";
import type { CreateLessonDto } from "../../types";
import type { AuthRequest } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";
import { SchedulingConflictError } from "../../utils";
import {
  createRecurringLessons,
  createSingleLesson,
  notifyLessonsCreated,
} from "../../services";
import { validateLessonData } from "./validators";

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateLessonDto = req.body;

    const validation = validateLessonData(data);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    let student: Student | null = null;
    if (data.studentId) {
      student = await prisma.student.findFirst({
        where: { id: data.studentId, tutorId: userId },
      });

      if (!student) {
        return res.status(404).json({ error: "Ученик не найден" });
      }
    }

    if (data.isRecurring && student) {
      const { created, first } = await createRecurringLessons(
        userId,
        data,
        student,
      );
      res.status(201).json({
        lesson: first,
        message: `Создано ${created.length} регулярных уроков`,
      });
      notifyLessonsCreated(userId, created, first);
      return;
    }

    const lesson = await createSingleLesson(userId, data, student);
    res.status(201).json({ lesson });
    notifyLessonsCreated(userId, [lesson], lesson);
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Create lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
