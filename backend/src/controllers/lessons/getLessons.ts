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
      weekly,
      weekStart,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const where: any = { tutorId: userId };

    // Date filtering: for weekly requests we only bound by weekStart..weekEnd
    if (weekly === "true" && weekStart) {
      const startOfWeek = truncateToMinute(new Date(weekStart as string));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfWeek,
        lte: endOfWeek,
      };
    } else {
      // Non-weekly: allow arbitrary start/end filters
      if (startDate || endDate) {
        where.startTime = {};
        if (startDate)
          where.startTime.gte = truncateToMinute(new Date(startDate as string));
        if (endDate)
          where.startTime.lte = truncateToMinute(new Date(endDate as string));
      }
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // Apply status/upcoming filtering only for non-weekly requests.
    if (weekly !== "true") {
      const upcomingFlag = upcoming === "true" && !!currentTime;
      if (upcomingFlag) {
        const now = truncateToMinute(new Date(currentTime as string));
        where.OR = [
          { status: "IN_PROGRESS" },
          {
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
            startTime: { gte: now },
          },
        ];
      } else if (status && typeof status === "string") {
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
        orderBy: {
          startTime: upcoming === "true" || weekly === "true" ? "asc" : "desc",
        },
        // Для недельных запросов не используем пагинацию
        ...(weekly !== "true" && { skip, take: limitNum }),
      }),
      prisma.lesson.count({ where }),
    ]);

    res.json({
      lessons,
      pagination:
        weekly === "true"
          ? undefined
          : {
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
