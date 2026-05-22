import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { buildStatisticsWhere, getDateRange, getLastMonthRange } from "./utils";
import { truncateToMinute } from "../../utils/time";
import { buildTaxBreakdown } from "../../services/taxRate";
import type { TaxRatePeriodDto } from "../../types";

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;
    const timezone = req.headers["x-timezone"] as string | undefined;

    const now = truncateToMinute(new Date());
    const where = buildStatisticsWhere(
      userId!,
      startDate as string,
      endDate as string,
      timezone
    );
    const paymentDateRange = getDateRange(
      startDate as string,
      endDate as string,
      timezone
    );
    const lastMonthRange = getLastMonthRange(timezone);

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
      currentUser,
    ] = await Promise.all([
      prisma.lesson.count({
        where: { ...where, status: "COMPLETED" },
      }),
      prisma.lesson.count({
        where: { ...where, status: "CANCELLED" },
      }),
      prisma.lesson.count({ where }),
      prisma.lesson.aggregate({
        where: { ...where, isPaid: true, status: "COMPLETED" },
        _sum: { price: true },
      }),
      prisma.lesson.aggregate({
        where: {
          tutorId: userId,
          startTime: lastMonthRange,
          isPaid: true,
        },
        _sum: { price: true },
      }),
      prisma.lesson.count({
        where: {
          ...where,
          status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
        },
      }),
      prisma.lesson.aggregate({
        where: {
          tutorId: userId,
          isPaid: true,
          status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
        },
        _sum: { price: true },
      }),
      prisma.lesson.aggregate({
        where: {
          ...where,
          tutorId: userId,
          status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
        },
        _sum: { price: true },
      }),
      prisma.lesson.count({
        where: { ...where, OR: [{ price: 0 }, { price: null }] },
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

    const twentyFourHoursAgo = truncateToMinute(
      new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    const taxEnabled = currentUser?.taxEnabled ?? false;

    const [
      lostEarnings,
      unpaid,
      unpaidOver24h,
      paymentsInRange,
      paidLessonsForTax,
    ] = await Promise.all([
      prisma.lesson.aggregate({
        where: { ...where, status: "CANCELLED" },
        _sum: { price: true },
      }),
      prisma.lesson.aggregate({
        where: { ...where, status: "COMPLETED", isPaid: false, price: { gt: 0 } },
        _count: { id: true },
        _sum: { price: true },
      }),
      prisma.lesson.aggregate({
        where: { ...where, status: "COMPLETED", isPaid: false, endTime: { lte: twentyFourHoursAgo }, price: { gt: 0 } },
        _count: { id: true },
        _sum: { price: true },
      }),
      // Lessons that contributed money in the filter window. Primary signal
      // is `paymentDate`, but legacy/imported lessons may be marked as paid
      // without one — for those we fall back to `startTime` so the income
      // still surfaces in the period it was earned.
      prisma.lesson.aggregate({
        where: {
          tutorId: userId,
          isPaid: true,
          price: { gt: 0 },
          OR: [
            { paymentDate: paymentDateRange },
            { paymentDate: null, startTime: paymentDateRange },
          ],
        },
        _count: { id: true },
        _sum: { price: true },
      }),
      taxEnabled
        ? prisma.lesson.findMany({
            where: {
              tutorId: userId,
              isPaid: true,
              price: { gt: 0 },
              OR: [
                { paymentDate: paymentDateRange },
                { paymentDate: null, startTime: paymentDateRange },
              ],
            },
            // Tax is normally assigned by paymentDate; if it's missing we use
            // startTime as the effective date (legacy lessons fallback).
            select: { price: true, paymentDate: true, startTime: true },
          })
        : Promise.resolve(null),
    ]);

    const earningsValue = earnings._sum.price?.toNumber() ?? 0;

    let taxAmount: number | null = null;
    let taxBreakdown: Awaited<
      ReturnType<typeof buildTaxBreakdown>
    >["taxBreakdown"] | null = null;

    if (taxEnabled && paidLessonsForTax && currentUser) {
      const periods: TaxRatePeriodDto[] = currentUser.taxRatePeriods.map(
        (period) => ({
          id: period.id,
          startDate: period.startDate.toISOString(),
          rate: period.rate.toNumber(),
        }),
      );
      // Pass the effective date (paymentDate ?? startTime) so legacy paid
      // lessons without a paymentDate still get a rate assigned.
      const lessonsForTax = paidLessonsForTax.map((lesson) => ({
        price: lesson.price === null ? null : lesson.price.toNumber(),
        paymentDate: lesson.paymentDate ?? lesson.startTime,
      }));
      const result = buildTaxBreakdown(lessonsForTax, periods, {
        start: paymentDateRange.gte,
        end: paymentDateRange.lte,
      });
      taxAmount = result.taxAmount;
      taxBreakdown = result.taxBreakdown;
    }

    res.json({
      completedLessons,
      cancelledLessons,
      totalLessons,
      upcomingLessons,
      earnings: earningsValue,
      lastMonthEarnings: lastMonthEarnings._sum.price?.toNumber() ?? 0,
      lostEarnings: lostEarnings._sum.price?.toNumber() ?? 0,
      prepaidIncome: prepaidIncome._sum.price?.toNumber() ?? 0,
      upcomingIncome: upcomingIncome._sum.price?.toNumber() ?? 0,
      trialLessonsCount: trialLessonsCount || 0,
      unpaidDebtSum: unpaid._sum.price?.toNumber() ?? 0,
      unpaidDebtCount: unpaid._count.id || 0,
      unpaidDebtOver24hSum: unpaidOver24h._sum.price?.toNumber() ?? 0,
      unpaidDebtOver24hCount: unpaidOver24h._count.id || 0,
      paymentsInRangeSum: paymentsInRange._sum.price?.toNumber() ?? 0,
      paymentsInRangeCount: paymentsInRange._count.id || 0,
      taxAmount,
      taxBreakdown,
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
