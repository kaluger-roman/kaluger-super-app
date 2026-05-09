import prisma from "../lib/prisma";
import { getWebSocketManager } from "../lib/wsManager";
import { truncateToMinute } from "../utils/time";

export const updateLessonStatuses = async () => {
  const now = truncateToMinute(new Date());
  const wsManager = getWebSocketManager();

  try {
    // Получаем уроки, которые должны стать IN_PROGRESS
    const lessonsToStart = await prisma.lesson.findMany({
      where: {
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
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

    // Обновляем статусы условно — пропускаем урок, если статус успели изменить
    // (например, пользователь вручную отменил урок между findMany и update)
    let startedCount = 0;
    let completedCount = 0;

    for (const lesson of lessonsToStart) {
      const result = await prisma.lesson.updateMany({
        where: {
          id: lesson.id,
          status: { in: ["SCHEDULED", "RESCHEDULED"] },
        },
        data: { status: "IN_PROGRESS" },
      });

      if (result.count === 0) continue;
      startedCount++;

      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          "IN_PROGRESS",
          lesson.tutorId
        );
      }
    }

    for (const lesson of lessonsToComplete) {
      const result = await prisma.lesson.updateMany({
        where: {
          id: lesson.id,
          status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] },
        },
        data: { status: "COMPLETED" },
      });

      if (result.count === 0) continue;
      completedCount++;

      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          "COMPLETED",
          lesson.tutorId
        );
      }
    }

    console.log(`Updated ${startedCount} lessons to IN_PROGRESS`);
    console.log(`Updated ${completedCount} lessons to COMPLETED`);

    return {
      startedLessons: startedCount,
      completedLessons: completedCount,
    };
  } catch (error) {
    console.error("Error updating lesson statuses:", error);
    throw error;
  }
};
