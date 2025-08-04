import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const where = {
      tutorId: userId,
      startTime: {
        gte: startDate ? new Date(startDate as string) : currentMonthStart,
        lte: endDate ? new Date(endDate as string) : currentMonthEnd,
      },
    };

    const [
      completedLessons,
      cancelledLessons,
      totalLessons,
      earnings,
      lastMonthEarnings,
      upcomingLessons,
    ] = await Promise.all([
      prisma.lesson.count({
        where: { ...where, status: "COMPLETED" },
      }),
      prisma.lesson.count({
        where: { ...where, status: "CANCELLED" },
      }),
      prisma.lesson.count({ where }),
      prisma.lesson.aggregate({
        where: { ...where, status: "COMPLETED", isPaid: true },
        _sum: { price: true },
      }),
      prisma.lesson.aggregate({
        where: {
          tutorId: userId,
          startTime: { gte: lastMonthStart, lte: lastMonthEnd },
          status: "COMPLETED",
          isPaid: true,
        },
        _sum: { price: true },
      }),
      prisma.lesson.count({
        where: {
          tutorId: userId,
          startTime: { gte: now },
          status: { in: ["SCHEDULED", "RESCHEDULED"] },
        },
      }),
    ]);

    const lostEarnings = await prisma.lesson.aggregate({
      where: { ...where, status: "CANCELLED" },
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
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Дополнительные статистические контроллеры можно добавить здесь
export const getLessonsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const where = {
      tutorId: userId,
      startTime: {
        gte: startDate ? new Date(startDate as string) : currentMonthStart,
        lte: endDate ? new Date(endDate as string) : currentMonthEnd,
      },
    };

    const lessonsBySubject = await prisma.lesson.groupBy({
      by: ["subject"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        price: true,
      },
    });

    res.json({ lessonsBySubject });
  } catch (error) {
    console.error("Get lessons by subject error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLessonsByType = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const where = {
      tutorId: userId,
      startTime: {
        gte: startDate ? new Date(startDate as string) : currentMonthStart,
        lte: endDate ? new Date(endDate as string) : currentMonthEnd,
      },
    };

    const lessonsByType = await prisma.lesson.groupBy({
      by: ["lessonType"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        price: true,
      },
    });

    res.json({ lessonsByType });
  } catch (error) {
    console.error("Get lessons by type error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStudentStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const where = {
      tutorId: userId,
      startTime: {
        gte: startDate ? new Date(startDate as string) : currentMonthStart,
        lte: endDate ? new Date(endDate as string) : currentMonthEnd,
      },
    };

    const studentStats = await prisma.lesson.groupBy({
      by: ["studentId"],
      where,
      _count: {
        id: true,
      },
      _sum: {
        price: true,
      },
    });

    // Получаем информацию о студентах
    const studentIds = studentStats.map((stat) => stat.studentId);
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        tutorId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const enrichedStats = studentStats.map((stat) => ({
      ...stat,
      student: students.find((s) => s.id === stat.studentId),
    }));

    res.json({ studentStatistics: enrichedStats });
  } catch (error) {
    console.error("Get student statistics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
