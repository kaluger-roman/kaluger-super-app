import prisma from "../lib/prisma";
import { getWebSocketManager } from "../lib/wsManager";
import { truncateToMinute } from "../utils/time";
import { broadcastStudentLessonStatusUpdated } from "./studentLessonBroadcast";

// Module-level guard prevents two overlapping cron ticks (e.g. tick N still
// running due to DB latency when tick N+1 fires) from both broadcasting the
// same lesson status change. Same pattern as `recurringRunning` in
// services/recurringLessons.ts and `backupRunning` in services/backup.ts.
let statusUpdaterRunning = false;

export const updateLessonStatuses = async () => {
  if (statusUpdaterRunning) {
    console.log("Skipping lesson status update: previous tick still active");
    return { startedLessons: 0, completedLessons: 0 };
  }
  statusUpdaterRunning = true;

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

    // Обновляем статусы батчами через updateMany c фильтром по статусу,
    // чтобы пропустить уроки, которые успели изменить параллельно
    // (например, пользователь вручную отменил урок между findMany и update).
    const idsToStart = lessonsToStart.map((l) => l.id);
    const idsToComplete = lessonsToComplete.map((l) => l.id);

    await Promise.all([
      idsToStart.length > 0
        ? prisma.lesson.updateMany({
            where: {
              id: { in: idsToStart },
              status: { in: ["SCHEDULED", "RESCHEDULED"] },
            },
            data: { status: "IN_PROGRESS" },
          })
        : Promise.resolve({ count: 0 }),
      idsToComplete.length > 0
        ? prisma.lesson.updateMany({
            where: {
              id: { in: idsToComplete },
              status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] },
            },
            data: { status: "COMPLETED" },
          })
        : Promise.resolve({ count: 0 }),
    ]);

    // Re-query фактически перешедшие уроки. Это защищает от broadcast про
    // IN_PROGRESS для уроков, которые параллельно ушли в CANCELLED между
    // findMany и updateMany — наш updateMany их пропустил по фильтру status.
    const [startedLessons, completedLessons] = await Promise.all([
      idsToStart.length > 0
        ? prisma.lesson.findMany({
            where: { id: { in: idsToStart }, status: "IN_PROGRESS" },
            select: { id: true, tutorId: true },
          })
        : Promise.resolve([]),
      idsToComplete.length > 0
        ? prisma.lesson.findMany({
            where: { id: { in: idsToComplete }, status: "COMPLETED" },
            select: { id: true, tutorId: true },
          })
        : Promise.resolve([]),
    ]);

    const startedCount = startedLessons.length;
    const completedCount = completedLessons.length;

    if (wsManager) {
      for (const lesson of startedLessons) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          "IN_PROGRESS",
          lesson.tutorId
        );
        void broadcastStudentLessonStatusUpdated(lesson.id, "IN_PROGRESS");
      }
      for (const lesson of completedLessons) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          "COMPLETED",
          lesson.tutorId
        );
        void broadcastStudentLessonStatusUpdated(lesson.id, "COMPLETED");
      }
    }

    if (startedCount > 0 || completedCount > 0) {
      console.log(
        `Updated ${startedCount} lessons to IN_PROGRESS, ${completedCount} to COMPLETED`
      );
    }

    return {
      startedLessons: startedCount,
      completedLessons: completedCount,
    };
  } catch (error) {
    console.error("Error updating lesson statuses:", error);
    throw error;
  } finally {
    statusUpdaterRunning = false;
  }
};
