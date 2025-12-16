import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { buildStatisticsWhere, getLastMonthRange } from "./utils";
import { truncateToMinute } from "../../utils/time";

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const now = truncateToMinute(new Date());
    const where = buildStatisticsWhere(
      userId!,
      startDate as string,
      endDate as string
    );
    // If client provided startDate/endDate, interpret those as UTC-day bounds
    // to avoid excluding times when client sends ISO date from toISOString().
    if (startDate || endDate) {
      const utcGte = startDate
        ? new Date(`${(startDate as string)}T00:00:00.000Z`)
        : undefined;
      const utcLte = endDate
        ? new Date(`${(endDate as string)}T23:59:59.999Z`)
        : undefined;

      if (utcGte || utcLte) {
        where.startTime = {
          ...(utcGte ? { gte: utcGte } : {}),
          ...(utcLte ? { lte: utcLte } : {}),
        } as any;
      }
    }
    const lastMonthRange = getLastMonthRange();

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
    ]);

    const lostEarnings = await prisma.lesson.aggregate({
      where: { ...where, status: "CANCELLED" },
      _sum: { price: true },
    });

    const unpaid = await prisma.lesson.aggregate({
      where: { ...where, status: "COMPLETED", isPaid: false, price: { gt: 0 } },
      _count: { id: true },
      _sum: { price: true },
    });

    const twentyFourHoursAgo = truncateToMinute(
      new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    const unpaidOver24h = await prisma.lesson.aggregate({
      where: {
        ...where,
        status: "COMPLETED",
        isPaid: false,
        endTime: { lte: twentyFourHoursAgo },
        price: { gt: 0 },
      },
      _count: { id: true },
      _sum: { price: true },
    });

    res.json({
      completedLessons,
      cancelledLessons,
      totalLessons,
      upcomingLessons,
      earnings: earnings._sum.price || 0,
      lastMonthEarnings: lastMonthEarnings._sum.price || 0,
      lostEarnings: lostEarnings._sum.price || 0,
      prepaidIncome: prepaidIncome._sum.price || 0,
      upcomingIncome: upcomingIncome._sum.price || 0,
      trialLessonsCount: trialLessonsCount || 0,
      unpaidDebtSum: unpaid._sum.price || 0,
      unpaidDebtCount: unpaid._count.id || 0,
      unpaidDebtOver24hSum: unpaidOver24h._sum.price || 0,
      unpaidDebtOver24hCount: unpaidOver24h._count.id || 0,
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
