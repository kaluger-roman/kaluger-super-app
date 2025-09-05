import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { truncateToMinute } from "../../utils/time";

export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      startDate,
      endDate,
      studentId,
      status,
      upcoming,
      currentTime,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tutorId: userId };

    // Специальная логика для предстоящих уроков
    if (upcoming === "true" && currentTime) {
      const now = truncateToMinute(new Date(currentTime as string));
      where.OR = [
        { status: "IN_PROGRESS" },
        {
          status: { in: ["SCHEDULED", "RESCHEDULED"] },
          startTime: { gte: now },
        },
      ];
    } else {
      // Обычная логика фильтрации
      if (startDate || endDate) {
        where.startTime = {};
        if (startDate)
          where.startTime.gte = truncateToMinute(new Date(startDate as string));
        if (endDate)
          where.startTime.lte = truncateToMinute(new Date(endDate as string));
      }

      if (studentId) {
        where.studentId = studentId;
      }

      if (status && typeof status === "string") {
        // Support multiple statuses separated by comma
        const statuses = status.split(",").map((s: string) => s.trim());
        if (statuses.length > 1) {
          where.status = { in: statuses };
        } else {
          where.status = status;
        }
      }
    }

    const [lessons, total] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          student: true,
        },
        orderBy: { startTime: upcoming === "true" ? "asc" : "desc" },
        skip,
        take: limitNum,
      }),
      prisma.lesson.count({ where }),
    ]);

    res.json({
      lessons,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get lessons error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const lesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
      include: {
        student: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    res.json({ lesson });
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
