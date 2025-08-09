import prisma from "../lib/prisma";
import { getWebSocketManager } from "../lib/wsManager";

export const updateLessonStatuses = async () => {
  const now = new Date();
  const wsManager = getWebSocketManager();

  try {
    // Получаем уроки, которые должны стать IN_PROGRESS
    const lessonsToStart = await prisma.lesson.findMany({
      where: {
        status: "SCHEDULED",
        startTime: {
          lte: now,
        },
        endTime: {
          gt: now,
        },
      },
    });

    // Получаем уроки, которые должны стать COMPLETED
    const lessonsToComplete = await prisma.lesson.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] },
        endTime: {
          lte: now,
        },
      },
    });

    // Обновляем статусы и отправляем WebSocket уведомления
    for (const lesson of lessonsToStart) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { status: "IN_PROGRESS" },
      });

      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          "IN_PROGRESS",
          lesson.tutorId
        );
      }
    }

    for (const lesson of lessonsToComplete) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { status: "COMPLETED" },
      });

      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          "COMPLETED",
          lesson.tutorId
        );
      }
    }

    console.log(`Updated ${lessonsToStart.length} lessons to IN_PROGRESS`);
    console.log(`Updated ${lessonsToComplete.length} lessons to COMPLETED`);

    return {
      startedLessons: lessonsToStart.length,
      completedLessons: lessonsToComplete.length,
    };
  } catch (error) {
    console.error("Error updating lesson statuses:", error);
    throw error;
  }
};
