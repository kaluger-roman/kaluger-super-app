import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deleteAllFuture } = req.body;
    const userId = req.user?.userId;

    // Check if lesson exists and belongs to user
    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingLesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    if (deleteAllFuture && existingLesson.isRecurring) {
      // Delete all future recurring lessons with the same pattern
      await prisma.lesson.deleteMany({
        where: {
          tutorId: userId,
          studentId: existingLesson.studentId,
          subject: existingLesson.subject,
          lessonType: existingLesson.lessonType,
          isRecurring: true,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
      });

      res.json({
        message: "Все будущие регулярные уроки успешно удалены",
      });
    } else {
      await prisma.lesson.delete({
        where: { id },
      });

      res.json({ message: "Урок успешно удален" });
    }
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
