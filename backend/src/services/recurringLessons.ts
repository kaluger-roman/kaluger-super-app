import prisma from "../lib/prisma";
import { groupRecurringLessonsByPattern } from "./recurringHelpers";
import type { LessonSlot } from "../types";
import { truncateToMinute } from "../utils/time";

// Module-level guard prevents two ticks (manual trigger overlapping the
// nightly cron, or restart in the middle of a run) from racing on the
// same slots. Same pattern as backupRunning in services/backup.ts.
let recurringRunning = false;

const overlaps = (slots: LessonSlot[], start: Date, end: Date): boolean =>
  slots.some((s) => s.startTime < end && s.endTime > start);

export const processRecurringLessons = async () => {
  if (recurringRunning) {
    console.log("Skipping recurring lessons run: previous tick still active");
    return;
  }
  recurringRunning = true;

  try {
    console.log("Processing recurring lessons...");

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

    const lessonGroups = groupRecurringLessonsByPattern(recurringLessons);

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    // Preload existing (non-cancelled) lessons per tutor in one query and check
    // conflicts in-memory. Previously this was a per-week findMany inside the
    // while loop (~13 queries per pattern, 5 patterns = 65 round-trips per cron tick).
    const tutorIds = [...new Set(recurringLessons.map((l) => l.tutorId))];
    const existingLessons = await prisma.lesson.findMany({
      where: {
        tutorId: { in: tutorIds },
        status: { not: "CANCELLED" },
        endTime: { gt: now },
      },
      select: { tutorId: true, startTime: true, endTime: true },
    });
    const slotsByTutor = new Map<string, LessonSlot[]>();
    for (const id of tutorIds) slotsByTutor.set(id, []);
    for (const e of existingLessons) {
      slotsByTutor
        .get(e.tutorId)!
        .push({ startTime: e.startTime, endTime: e.endTime });
    }

    let createdCount = 0;

    for (const [, lastLesson] of lessonGroups) {
      let currentStart = truncateToMinute(
        new Date(lastLesson.startTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      );
      let currentEnd = truncateToMinute(
        new Date(lastLesson.endTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      const tutorSlots = slotsByTutor.get(lastLesson.tutorId)!;
      const lessonsToCreate = [];

      while (currentStart <= threeMonthsFromNow) {
        if (!overlaps(tutorSlots, currentStart, currentEnd)) {
          lessonsToCreate.push({
            subject: lastLesson.subject,
            lessonType: lastLesson.lessonType,
            startTime: currentStart,
            endTime: currentEnd,
            price: lastLesson.price,
            isRecurring: true,
            tutorId: lastLesson.tutorId,
            studentId: lastLesson.studentId,
            status: "SCHEDULED" as const,
          });
          // Track in-memory so subsequent patterns of the same tutor
          // see this slot as occupied (mirrors the prior DB-roundtrip behavior
          // where a previous pattern's createMany would be visible).
          tutorSlots.push({ startTime: currentStart, endTime: currentEnd });
        }

        currentStart = truncateToMinute(
          new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
        currentEnd = truncateToMinute(
          new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
      }

      if (lessonsToCreate.length > 0) {
        await prisma.lesson.createMany({ data: lessonsToCreate });
        createdCount += lessonsToCreate.length;
      }
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
