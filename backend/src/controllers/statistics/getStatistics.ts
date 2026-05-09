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
      prisma.lesson.aggregate({
        where: { tutorId: userId, isPaid: true, paymentDate: paymentDateRange, price: { gt: 0 } },
        _count: { id: true },
        _sum: { price: true },
      }),
      taxEnabled
        ? prisma.lesson.findMany({
            where: {
              tutorId: userId,
              isPaid: true,
              paymentDate: paymentDateRange,
              price: { gt: 0 },
            },
            select: { price: true, paymentDate: true },
          })
        : Promise.resolve(null),
    ]);

    const earningsValue = earnings._sum.price || 0;

    let taxAmount: number | null = null;
    let taxBreakdown: Awaited<
      ReturnType<typeof buildTaxBreakdown>
    >["taxBreakdown"] | null = null;

    if (taxEnabled && paidLessonsForTax && currentUser) {
      const periods: TaxRatePeriodDto[] = currentUser.taxRatePeriods.map(
        (period) => ({
          id: period.id,
          startDate: period.startDate.toISOString(),
          rate: period.rate,
        }),
      );
      const result = buildTaxBreakdown(paidLessonsForTax, periods);
      taxAmount = result.taxAmount;
      taxBreakdown = result.taxBreakdown;
    }

    res.json({
      completedLessons,
      cancelledLessons,
      totalLessons,
      upcomingLessons,
      earnings: earningsValue,
      lastMonthEarnings: lastMonthEarnings._sum.price || 0,
      lostEarnings: lostEarnings._sum.price || 0,
      prepaidIncome: prepaidIncome._sum.price || 0,
      upcomingIncome: upcomingIncome._sum.price || 0,
      trialLessonsCount: trialLessonsCount || 0,
      unpaidDebtSum: unpaid._sum.price || 0,
      unpaidDebtCount: unpaid._count.id || 0,
      unpaidDebtOver24hSum: unpaidOver24h._sum.price || 0,
      unpaidDebtOver24hCount: unpaidOver24h._count.id || 0,
      paymentsInRangeSum: paymentsInRange._sum.price || 0,
      paymentsInRangeCount: paymentsInRange._count.id || 0,
      taxAmount,
      taxBreakdown,
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
