import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import {
  ACTIVE_REMINDER_STATUSES,
  broadcastStudentLessonDeleted,
  getRecurringLessonKey,
  getStudentUserIdByLessonId,
} from "../../services";

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deleteAllFuture } = req.body;
    const userId = req.user?.userId;

    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingLesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    if (deleteAllFuture && existingLesson.isRecurring && existingLesson.studentId) {
      const baseKey = getRecurringLessonKey(existingLesson);

      const futureLessons = await prisma.lesson.findMany({
        where: {
          tutorId: userId,
          studentId: existingLesson.studentId,
          subject: existingLesson.subject,
          lessonType: existingLesson.lessonType,
          isRecurring: true,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
      });

      const toDeleteIds = futureLessons
        .filter((l) => getRecurringLessonKey(l) === baseKey)
        .map((l) => l.id);

      const studentUserId = toDeleteIds[0]
        ? await getStudentUserIdByLessonId(toDeleteIds[0])
        : null;

      if (toDeleteIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.scheduledReminder.updateMany({
            where: {
              lessonId: { in: toDeleteIds },
              status: { in: [...ACTIVE_REMINDER_STATUSES] },
            },
            data: { status: "CANCELLED", claimedAt: null },
          });
          await tx.lesson.deleteMany({ where: { id: { in: toDeleteIds } } });
        });
      }

      res.json({
        message: "Будущие регулярные уроки данной серии успешно удалены",
        deleted: toDeleteIds.length,
      });

      for (const lessonId of toDeleteIds) {
        void broadcastStudentLessonDeleted(lessonId, studentUserId);
      }
    } else {
      const studentUserId = await getStudentUserIdByLessonId(id);

      await prisma.$transaction(async (tx) => {
        await tx.scheduledReminder.updateMany({
          where: {
            lessonId: id,
            status: { in: [...ACTIVE_REMINDER_STATUSES] },
          },
          data: { status: "CANCELLED", claimedAt: null },
        });
        await tx.lesson.delete({ where: { id } });
      });

      res.json({ message: "Урок успешно удален" });

      void broadcastStudentLessonDeleted(id, studentUserId);
    }
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
