import prisma from "../lib/prisma";
import { groupRecurringLessonsByPattern } from "./recurringHelpers";

export const processRecurringLessons = async () => {
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

    for (const [_, baseLesson] of lessonGroups) {
      // Найти последний урок в этой серии
      const lastLesson = await prisma.lesson.findFirst({
        where: {
          tutorId: baseLesson.tutorId,
          studentId: baseLesson.studentId,
          isRecurring: true,
          subject: baseLesson.subject,
          lessonType: baseLesson.lessonType,
        },
        orderBy: {
          startTime: "desc",
        },
      });

      if (!lastLesson) continue;

      // Создаем уроки от последнего существующего до 3 месяцев вперед
      let currentStart = new Date(
        lastLesson.startTime.getTime() + 7 * 24 * 60 * 60 * 1000
      );
      let currentEnd = new Date(
        lastLesson.endTime.getTime() + 7 * 24 * 60 * 60 * 1000
      );

      const lessonsToCreate = [];

      while (currentStart <= threeMonthsFromNow) {
        // Проверяем конфликты
        const conflicts = await prisma.lesson.findMany({
          where: {
            tutorId: baseLesson.tutorId,
            status: {
              not: "CANCELLED",
            },
            OR: [
              {
                startTime: {
                  lt: currentEnd,
                },
                endTime: {
                  gt: currentStart,
                },
              },
            ],
          },
        });

        if (conflicts.length === 0) {
          lessonsToCreate.push({
            subject: baseLesson.subject,
            lessonType: baseLesson.lessonType,
            startTime: currentStart,
            endTime: currentEnd,
            price: baseLesson.price,
            isRecurring: true,
            tutorId: baseLesson.tutorId,
            studentId: baseLesson.studentId,
          });
        }

        // Переходим к следующей неделе
        currentStart = new Date(
          currentStart.getTime() + 7 * 24 * 60 * 60 * 1000
        );
        currentEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      if (lessonsToCreate.length > 0) {
        await prisma.lesson.createMany({
          data: lessonsToCreate,
        });
        createdCount += lessonsToCreate.length;
      }
    }

    console.log(`Created ${createdCount} new recurring lessons`);
    return createdCount;
  } catch (error) {
    console.error("Error processing recurring lessons:", error);
    throw error;
  }
};
