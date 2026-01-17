import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { Lesson } from "@prisma/client";

export const findNextUnpaidLesson = async (
  tutorId: string,
  cancelledLesson: Lesson
) =>
  prisma.lesson.findFirst({
    where: {
      id: { not: cancelledLesson.id },
      tutorId: tutorId,
      studentId: cancelledLesson.studentId,
      status: { in: ["SCHEDULED", "RESCHEDULED"] },
      isPaid: false,
      price: { equals: cancelledLesson.price },
      startTime: { gt: new Date() },
    },
    orderBy: { startTime: "asc" },
    include: { student: { select: { name: true } } },
  });

export const getLessonCancellationInfo = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const lesson = await prisma.lesson.findFirst({
      where: { id, tutorId: userId },
      include: {
        student: { select: { id: true, name: true } },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    if (!lesson.isPaid || !lesson.paymentDate) {
      return res.json({ cancellationInfo: null });
    }

    const nextLesson = await findNextUnpaidLesson(userId!, lesson);

    if (!nextLesson) {
      return res.json({ cancellationInfo: null });
    }

    const cancellationInfo = {
      nextLessonId: nextLesson.id,
      nextLessonStartTime: nextLesson.startTime.toISOString(),
      nextLessonStudentName: nextLesson.student?.name || "",
      transferAmount: lesson.price || 0,
      transferDate: lesson.paymentDate.toISOString(),
    };

    res.json({ cancellationInfo });
  } catch (error) {
    console.error("Get cancellation info error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
