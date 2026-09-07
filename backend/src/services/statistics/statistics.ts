import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { truncateToMinute } from "../../utils/time";
import { computeTaxSummary, decimalToNumber } from "./statistics.helpers";
import type {
  DateRange,
  LessonStatistics,
  LessonStatisticsInput,
} from "./statistics.types";

const ACTIVE_STATUSES = ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

// Lessons that contributed money in the filter window. Primary signal
// is `paymentDate`, but legacy/imported lessons may be marked as paid
// without one — for those we fall back to `startTime` so the income
// still surfaces in the period it was earned.
const paidInRangeWhere = (
  userId: string,
  range: DateRange,
): Prisma.LessonWhereInput => ({
  tutorId: userId,
  isPaid: true,
  price: { gt: 0 },
  OR: [{ paymentDate: range }, { paymentDate: null, startTime: range }],
});

export const collectLessonStatistics = async ({
  userId,
  where,
  paymentDateRange,
  lastMonthRange,
  now,
}: LessonStatisticsInput): Promise<LessonStatistics> => {
  const twentyFourHoursAgo = truncateToMinute(new Date(now.getTime() - DAY_MS));
  const unpaidWhere: Prisma.LessonWhereInput = {
    ...where,
    status: "COMPLETED",
    isPaid: false,
    price: { gt: 0 },
  };

  const [
    completedLessons,
    cancelledLessons,
    totalLessons,
    earnings,
    lastMonthEarnings,
    upcomingLessons,
    prepaidIncome,
    upcomingIncome,
    trialLessonsCount,
    lostEarnings,
    unpaid,
    unpaidOver24h,
    paymentsInRange,
    currentUser,
  ] = await Promise.all([
    prisma.lesson.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.lesson.count({ where: { ...where, status: "CANCELLED" } }),
    prisma.lesson.count({ where }),
    prisma.lesson.aggregate({
      where: { ...where, isPaid: true, status: "COMPLETED" },
      _sum: { price: true },
    }),
    prisma.lesson.aggregate({
      where: { tutorId: userId, startTime: lastMonthRange, isPaid: true },
      _sum: { price: true },
    }),
    prisma.lesson.count({
      where: { ...where, status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.lesson.aggregate({
      where: {
        tutorId: userId,
        isPaid: true,
        status: { in: [...ACTIVE_STATUSES] },
      },
      _sum: { price: true },
    }),
    prisma.lesson.aggregate({
      where: { ...where, tutorId: userId, status: { in: [...ACTIVE_STATUSES] } },
      _sum: { price: true },
    }),
    prisma.lesson.count({
      where: { ...where, OR: [{ price: 0 }, { price: null }] },
    }),
    prisma.lesson.aggregate({
      where: { ...where, status: "CANCELLED" },
      _sum: { price: true },
    }),
    prisma.lesson.aggregate({
      where: unpaidWhere,
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.lesson.aggregate({
      where: { ...unpaidWhere, endTime: { lte: twentyFourHoursAgo } },
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.lesson.aggregate({
      where: paidInRangeWhere(userId, paymentDateRange),
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        taxEnabled: true,
        taxRatePeriods: {
          orderBy: { startDate: "asc" },
          select: { id: true, startDate: true, rate: true },
        },
      },
    }),
  ]);

  const paidLessonsForTax = currentUser?.taxEnabled
    ? await prisma.lesson.findMany({
        where: paidInRangeWhere(userId, paymentDateRange),
        // Tax is normally assigned by paymentDate; if it's missing we use
        // startTime as the effective date (legacy lessons fallback).
        select: { price: true, paymentDate: true, startTime: true },
      })
    : null;

  return {
    completedLessons,
    cancelledLessons,
    totalLessons,
    upcomingLessons,
    earnings: decimalToNumber(earnings._sum.price),
    lastMonthEarnings: decimalToNumber(lastMonthEarnings._sum.price),
    lostEarnings: decimalToNumber(lostEarnings._sum.price),
    prepaidIncome: decimalToNumber(prepaidIncome._sum.price),
    upcomingIncome: decimalToNumber(upcomingIncome._sum.price),
    trialLessonsCount: trialLessonsCount || 0,
    unpaidDebtSum: decimalToNumber(unpaid._sum.price),
    unpaidDebtCount: unpaid._count.id || 0,
    unpaidDebtOver24hSum: decimalToNumber(unpaidOver24h._sum.price),
    unpaidDebtOver24hCount: unpaidOver24h._count.id || 0,
    paymentsInRangeSum: decimalToNumber(paymentsInRange._sum.price),
    paymentsInRangeCount: paymentsInRange._count.id || 0,
    ...computeTaxSummary(currentUser, paidLessonsForTax, paymentDateRange),
  };
};
