import prisma from "../lib/prisma";
import { groupRecurringLessonsByPattern } from "./recurringHelpers";
import { truncateToMinute } from "../utils/time";

// Module-level guard prevents two ticks (or a manual trigger overlapping the
// nightly cron) from racing on conflict-check + createMany and inserting
// duplicate slots. Same pattern as backupRunning in services/backup.ts.
let recurringRunning = false;

export const processRecurringLessons = async () => {
  if (recurringRunning) {
    console.log("Skipping recurring lessons run: previous tick still active");
    return;
  }
  recurringRunning = true;

  try {
    console.log("Processing recurring lessons...");

    // Найти все регулярные уроки
    const recurringLessons = await prisma.lesson.findMany({
      where: {
        isRecurring: true,
        status: "SCHEDULED",
      },
      include: {
        student: true,
      },
    });

    if (recurringLessons.length === 0) {
      console.log("No recurring lessons found");
      return;
    }

    // Группируем уроки по уникальным комбинациям (tutor + student + time pattern)
    const lessonGroups = groupRecurringLessonsByPattern(recurringLessons);

    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    let createdCount = 0;

    for (const [_, lastLesson] of lessonGroups) {
      // Создаем уроки от последнего существующего до 3 месяцев вперед
      let currentStart = truncateToMinute(
        new Date(lastLesson.startTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      );
      let currentEnd = truncateToMinute(
        new Date(lastLesson.endTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      const candidateSlots: Array<{ start: Date; end: Date }> = [];

      while (currentStart <= threeMonthsFromNow) {
        candidateSlots.push({ start: currentStart, end: currentEnd });
        currentStart = truncateToMinute(
          new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
        currentEnd = truncateToMinute(
          new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
      }

      if (candidateSlots.length === 0) continue;

      // Атомарная проверка конфликтов + вставка для всей группы. Если между
      // findMany и createMany другой запрос (или соседний tick) уже занял
      // слот — он будет виден в findMany через snapshot транзакции.
      const groupCreated = await prisma.$transaction(async (tx) => {
        const lessonsToCreate = [];
        for (const slot of candidateSlots) {
          const conflicts = await tx.lesson.findMany({
            where: {
              tutorId: lastLesson.tutorId,
              status: { not: "CANCELLED" },
              OR: [
                {
                  startTime: { lt: slot.end },
                  endTime: { gt: slot.start },
                },
              ],
            },
          });

          if (conflicts.length === 0) {
            lessonsToCreate.push({
              subject: lastLesson.subject,
              lessonType: lastLesson.lessonType,
              startTime: slot.start,
              endTime: slot.end,
              price: lastLesson.price,
              isRecurring: true,
              tutorId: lastLesson.tutorId,
              studentId: lastLesson.studentId,
              status: "SCHEDULED" as const,
            });
          }
        }

        if (lessonsToCreate.length === 0) return 0;

        await tx.lesson.createMany({ data: lessonsToCreate });
        return lessonsToCreate.length;
      });

      createdCount += groupCreated;
    }

    console.log(`Created ${createdCount} new recurring lessons`);
    return createdCount;
  } catch (error) {
    console.error("Error processing recurring lessons:", error);
    throw error;
  } finally {
    recurringRunning = false;
  }
};
