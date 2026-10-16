import type { LessonStatus } from "@prisma/client";
import { truncateToMinute } from "../../utils/time";
import type { PrismaLike, RecurringSlot } from "./lessonCreation.types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RECURRING_HORIZON_MONTHS = 3;

export const computeLessonStatus = (
  start: Date,
  end: Date,
  now: Date
): LessonStatus | undefined => {
  if (end.getTime() <= now.getTime()) {
    return "COMPLETED";
  }
  if (start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
    return "IN_PROGRESS";
  }
  return undefined;
};

export const buildRecurringSlots = (start: Date, end: Date): RecurringSlot[] => {
  const slots: RecurringSlot[] = [];
  const horizon = truncateToMinute(new Date(start));
  horizon.setMonth(horizon.getMonth() + RECURRING_HORIZON_MONTHS);

  let currentStart = truncateToMinute(new Date(start));
  let currentEnd = truncateToMinute(new Date(end));

  while (currentStart <= horizon) {
    slots.push({
      start: truncateToMinute(currentStart),
      end: truncateToMinute(currentEnd),
      isFirst: currentStart.getTime() === start.getTime(),
    });
    currentStart = truncateToMinute(new Date(currentStart.getTime() + WEEK_MS));
    currentEnd = truncateToMinute(new Date(currentEnd.getTime() + WEEK_MS));
  }

  return slots;
};

export const checkSchedulingConflicts = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  prisma: PrismaLike
) => {
  return prisma.lesson.findMany({
    where: {
      tutorId: userId,
      status: {
        not: "CANCELLED",
      },
      OR: [
        {
          startTime: {
            lt: endTime,
          },
          endTime: {
            gt: startTime,
          },
        },
      ],
    },
  });
};
