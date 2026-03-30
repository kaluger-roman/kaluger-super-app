import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { buildStatisticsWhere } from "./utils";

export const getLessonsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;
    const timezone = req.headers["x-timezone"] as string | undefined;

    const where = buildStatisticsWhere(
      userId!,
      startDate as string,
      endDate as string,
      timezone
    );

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
    const timezone = req.headers["x-timezone"] as string | undefined;

    const where = buildStatisticsWhere(
      userId!,
      startDate as string,
      endDate as string,
      timezone
    );

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
