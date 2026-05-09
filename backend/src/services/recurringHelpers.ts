import type { Lesson, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import type { ShiftResult } from "../types";
import { truncateToMinute } from "../utils/time";

type PlannedShift = {
  original: Lesson;
  shiftedStart: Date;
  shiftedEnd: Date;
};

type ShiftConflict = {
  lessonId: string;
  conflictingLessonId: string;
};

export type ShiftPreview = {
  planned: PlannedShift[];
  conflicts: ShiftConflict[];
};

// Build a stable grouping key for recurring lessons
export const getRecurringLessonKey = (lesson: Lesson) => {
  const t = truncateToMinute(new Date(lesson.startTime));
  const weekday = t.getUTCDay();
  const hour = t.getUTCHours();
  const minute = t.getUTCMinutes();

  return `${lesson.tutorId}-${lesson.studentId}-${weekday}-${hour}-${minute}`;
};

// Group recurring lessons by a pattern: tutorId-studentId-weekday-hour-minute
// Returns a Map where the value is the latest lesson for that pattern
export const groupRecurringLessonsByPattern = (lessons: Array<Lesson>) => {
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

// Compute (without persisting) the set of recurring lessons that would shift
// when a base lesson's time changes, plus any conflicts those shifts would
// cause. Returns the plan so callers can apply it inside an outer transaction
// — this prevents the partial-state bug where the base lesson commits but the
// shifts are aborted by a late-detected conflict.
export const previewShiftFutureRecurringLessons = async (
  existingLesson: Lesson,
  newStart: Date,
  newEnd: Date
): Promise<ShiftPreview> => {
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
    return { planned: [], conflicts: [] };
  }

  const toShift = futureLessons.filter((l) => getRecurringLessonKey(l) === key);

  const planned: PlannedShift[] = toShift.map((l) => {
    const shiftedStart = truncateToMinute(
      new Date(new Date(l.startTime).getTime() + deltaStart)
    );
    const shiftedEnd = truncateToMinute(
      new Date(new Date(l.endTime).getTime() + deltaEnd)
    );
    return { original: l, shiftedStart, shiftedEnd };
  });

  const plannedIds = planned.map((pl) => pl.original.id);

  const conflictResults = await Promise.all(
    planned.map(async (p) => {
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

  const conflicts: ShiftConflict[] = conflictResults
    .filter((r) => !!r.conflict)
    .map((r) => ({
      lessonId: r.planned.original.id,
      conflictingLessonId: r.conflict!.id,
    }));

  return { planned, conflicts };
};

// Apply a pre-computed set of recurring shifts inside the given transaction.
export const applyShiftFutureRecurringLessons = async (
  tx: Prisma.TransactionClient,
  planned: PlannedShift[]
): Promise<ShiftResult> => {
  if (planned.length === 0) {
    return { shifted: 0 };
  }

  for (const p of planned) {
    await tx.lesson.update({
      where: { id: p.original.id },
      data: { startTime: p.shiftedStart, endTime: p.shiftedEnd },
    });
  }

  return {
    shifted: planned.length,
    shiftedIds: planned.map((p) => p.original.id),
  };
};

// Shift future recurring lessons in the same group when a base lesson time changes.
// If any planned shift conflicts with existing lessons, abort all shifts and return conflicts.
export const shiftFutureRecurringLessons = async (
  existingLesson: Lesson,
  newStart: Date,
  newEnd: Date
): Promise<ShiftResult> => {
  const preview = await previewShiftFutureRecurringLessons(
    existingLesson,
    newStart,
    newEnd
  );

  if (preview.conflicts.length > 0) {
    return { shifted: 0, conflicts: preview.conflicts };
  }

  return prisma.$transaction((tx) =>
    applyShiftFutureRecurringLessons(tx, preview.planned)
  );
};

// Update price for future recurring lessons in the same group
export const updatePriceForFutureRecurringLessons = async (
  existingLesson: Lesson,
  newPrice: number | null
): Promise<{ updated: number }> => {
  const key = getRecurringLessonKey(existingLesson);

  const futureLessons = await prisma.lesson.findMany({
    where: {
      tutorId: existingLesson.tutorId,
      studentId: existingLesson.studentId,
      isRecurring: true,
      status: "SCHEDULED",
    },
  });

  const toUpdate = futureLessons.filter(
    (l) => getRecurringLessonKey(l) === key
  );

  if (toUpdate.length === 0) return { updated: 0 };

  // Perform updates in a transaction
  await prisma.$transaction(
    toUpdate.map((t) =>
      prisma.lesson.update({ where: { id: t.id }, data: { price: newPrice } })
    )
  );

  return { updated: toUpdate.length };
};
