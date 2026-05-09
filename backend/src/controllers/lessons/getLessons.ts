import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { truncateToMinute } from "../../utils/time";
import type { Prisma, LessonStatus } from "@prisma/client";

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
      noPagination,
      weekStart,
      onlyUnpaid,
      onlyWithoutHomework,
      paymentDateFrom,
      paymentDateTo,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string, 10) || 10)
    );
    const skip = (pageNum - 1) * limitNum;
    const where: Prisma.LessonWhereInput = { tutorId: userId };

    if (weekly === "true" && weekStart) {
      const startOfWeek = truncateToMinute(new Date(weekStart as string));
      // End of week = start + 7 days - 1ms (timezone-agnostic arithmetic)
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      where.startTime = {
        gte: startOfWeek,
        lte: endOfWeek,
      };
    } else {
      if (startDate || endDate) {
        const dtFilter: { gte?: Date; lte?: Date } = {};
        if (startDate)
          dtFilter.gte = truncateToMinute(new Date(startDate as string));
        if (endDate)
          dtFilter.lte = truncateToMinute(new Date(endDate as string));
        where.startTime = dtFilter as Prisma.LessonWhereInput["startTime"];
      }
    }

    if (studentId) {
      where.studentId = studentId as string;
    }

    if (onlyUnpaid === "true") {
      where.isPaid = false;
      where.price = { gt: 0 } as Prisma.LessonWhereInput["price"];
    } else if (paymentDateFrom || paymentDateTo) {
      if (
        paymentDateFrom &&
        paymentDateTo &&
        new Date(paymentDateFrom as string) > new Date(paymentDateTo as string)
      ) {
        return res
          .status(400)
          .json({ error: "Дата начала оплаты не может быть позже даты окончания" });
      }

      const pdFilter: { not: null; gte?: Date; lte?: Date } = { not: null };
      if (paymentDateFrom) {
        pdFilter.gte = new Date(paymentDateFrom as string);
      }
      if (paymentDateTo) {
        pdFilter.lte = new Date(paymentDateTo as string);
      }
      where.paymentDate = pdFilter as Prisma.LessonWhereInput["paymentDate"];
    }

    if (onlyWithoutHomework === "true") {
      where.isHomeworkSentByTeacher = false;
    }

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
        const statuses = status
          .split(",")
          .map((s: string) => s.trim() as LessonStatus);
        if (statuses.length > 1) {
          where.status = { in: statuses };
        } else {
          where.status = status as LessonStatus;
        }
      }
    }

    const hasPaymentDateFilter = Boolean(paymentDateFrom || paymentDateTo);

    const [lessons, total, paymentsAggregate] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          student: true,
        },
        orderBy: {
          startTime: upcoming === "true" || weekly === "true" ? "asc" : "desc",
        },
        // Если явно запрошено отключение пагинации или это weekly-запрос — не используем пагинацию
        ...(weekly !== "true" &&
          noPagination !== "true" && { skip, take: limitNum }),
      }),
      prisma.lesson.count({ where }),
      hasPaymentDateFilter
        ? prisma.lesson.aggregate({
            where: { ...where, isPaid: true, price: { gt: 0 } },
            _sum: { price: true },
            _count: { id: true },
          })
        : Promise.resolve(null),
    ]);

    res.json({
      lessons,
      pagination:
        weekly === "true" || noPagination === "true"
          ? undefined
          : {
              total,
              page: pageNum,
              limit: limitNum,
              totalPages: Math.ceil(total / limitNum),
            },
      ...(paymentsAggregate && {
        paymentsSummary: {
          sum: paymentsAggregate._sum.price || 0,
          count: paymentsAggregate._count.id || 0,
        },
      }),
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
