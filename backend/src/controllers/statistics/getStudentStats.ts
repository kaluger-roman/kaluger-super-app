import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { buildStatisticsWhere } from "./utils";

export const getStudentStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const where = buildStatisticsWhere(
      userId!,
      startDate as string,
      endDate as string
    );

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

    // Получаем информацию о учениках
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
