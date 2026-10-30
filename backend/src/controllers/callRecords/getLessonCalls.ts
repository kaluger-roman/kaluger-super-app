import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth";
import { getLessonCallsForTutor } from "../../services";

export const getTutorLessonCalls = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tutorUserId = req.user?.userId;
    if (!tutorUserId) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    const items = await getLessonCallsForTutor(tutorUserId, req.params.lessonId);
    res.json({ items });
  } catch (error) {
    console.error("Get lesson calls error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
