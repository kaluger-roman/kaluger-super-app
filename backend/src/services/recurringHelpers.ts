import prisma from "../lib/prisma";
import { truncateToMinute } from "../utils/time";

// Build a stable grouping key for recurring lessons
export const getRecurringLessonKey = (lesson: any) => {
  const t = truncateToMinute(new Date(lesson.startTime));
  const weekday = t.getDay();
  const hour = t.getHours();
  const minute = t.getMinutes();

  return `${lesson.tutorId}-${lesson.studentId}-${weekday}-${hour}-${minute}`;
};

// Group recurring lessons by a pattern: tutorId-studentId-weekday-hour-minute-duration
// Returns a Map where the value is the latest lesson for that pattern
export const groupRecurringLessonsByPattern = (lessons: Array<any>) => {
  const lessonGroups = new Map<string, (typeof lessons)[0]>();

  for (const lesson of lessons) {
    const key = getRecurringLessonKey(lesson);

    // Keep the latest lesson for the group
    if (
      !lessonGroups.has(key) ||
      new Date(lesson.startTime) > new Date(lessonGroups.get(key)!.startTime)
    ) {
      lessonGroups.set(key, lesson);
    }
  }

  return lessonGroups;
};

// Shift future recurring lessons in the same group when a base lesson time changes.
// If any planned shift conflicts with existing lessons, abort all shifts and return conflicts.
export const shiftFutureRecurringLessons = async (
  existingLesson: any,
  newStart: Date,
  newEnd: Date
): Promise<{
  shifted: number;
  conflicts?: Array<{ lessonId: string; conflictingLessonId: string }>;
}> => {
  const oldStart = truncateToMinute(new Date(existingLesson.startTime));
  const oldEnd = truncateToMinute(new Date(existingLesson.endTime));

  const deltaStart = newStart.getTime() - oldStart.getTime();
  const deltaEnd = newEnd.getTime() - oldEnd.getTime();

  const key = getRecurringLessonKey(existingLesson);

  const futureLessons = await prisma.lesson.findMany({
    where: {
      tutorId: existingLesson.tutorId,
      studentId: existingLesson.studentId,
      isRecurring: true,
      status: "SCHEDULED",
    },
  });

  const groups = groupRecurringLessonsByPattern(
    futureLessons.concat(existingLesson)
  );
  const base = groups.get(key);

  if (!base) {
    return { shifted: 0 };
  }

  const toShift = futureLessons.filter((l) => getRecurringLessonKey(l) === key);

  const planned = toShift.map((l) => {
    const shiftedStart = truncateToMinute(
      new Date(new Date(l.startTime).getTime() + deltaStart)
    );
    const shiftedEnd = truncateToMinute(
      new Date(new Date(l.endTime).getTime() + deltaEnd)
    );
    return { original: l, shiftedStart, shiftedEnd };
  });

  // Pre-check conflicts for all planned shifts
  const conflictResults = await Promise.all(
    planned.map(async (p) => {
      const plannedIds = planned.map((pl) => pl.original.id);

      const conflict = await prisma.lesson.findFirst({
        where: {
          id: { notIn: plannedIds },
          tutorId: existingLesson.tutorId,
          status: { not: "CANCELLED" },
          AND: [
            { startTime: { lt: p.shiftedEnd } },
            { endTime: { gt: p.shiftedStart } },
          ],
        },
      });

      return { planned: p, conflict };
    })
  );

  const conflicts = conflictResults
    .filter((r) => !!r.conflict)
    .map((r) => ({
      lessonId: r.planned.original.id,
      conflictingLessonId: r.conflict!.id,
    }));

  if (conflicts.length > 0) {
    // Abort all shifts if any conflict detected
    return { shifted: 0, conflicts };
  }

  // Apply all shifts in a transaction
  await prisma.$transaction(
    planned.map((p) =>
      prisma.lesson.update({
        where: { id: p.original.id },
        data: { startTime: p.shiftedStart, endTime: p.shiftedEnd },
      })
    )
  );

  return { shifted: planned.length };
};
