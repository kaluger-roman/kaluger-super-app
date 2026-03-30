import type { Response } from "express";
import type { AdminRequest } from "../../types";
import prisma from "../../lib/prisma";

export const getOverview = async (req: AdminRequest, res: Response) => {
  try {
    const [usersCount, studentsCount, lessonsCount] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.lesson.count(),
    ]);

    res.json({
      usersCount,
      studentsCount,
      lessonsCount,
      serverUptime: Math.floor(process.uptime()),
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ error: "Ошибка получения обзора" });
  }
};
