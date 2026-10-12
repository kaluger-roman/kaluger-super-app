import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";
import {
  tryAttachCommissionToLessons,
  buildLessonsWhere,
  fetchLessonsPage,
  parseLessonsPagination,
  parseLessonsQuery,
} from "../../services";

export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const params = parseLessonsQuery(req.query);

    if (
      params.onlyUnpaid !== "true" &&
      params.paymentDateFrom &&
      params.paymentDateTo &&
      new Date(params.paymentDateFrom) > new Date(params.paymentDateTo)
    ) {
      return res
        .status(400)
        .json({ error: "Дата начала оплаты не может быть позже даты окончания" });
    }

    const isWeekly = params.weekly === "true";
    const pagination =
      isWeekly || params.noPagination === "true" ? null : parseLessonsPagination(params);

    const { lessons, total, paymentsSummary } = await fetchLessonsPage(
      buildLessonsWhere(userId, params),
      {
        tutorId: userId,
        orderAsc: params.upcoming === "true" || isWeekly,
        pagination,
        withPaymentsSummary: Boolean(params.paymentDateFrom || params.paymentDateTo),
      }
    );

    res.json({
      lessons,
      pagination: pagination
        ? {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
          }
        : undefined,
      ...(paymentsSummary && { paymentsSummary }),
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

    const [lessonWithCommission] = await tryAttachCommissionToLessons(userId!, [lesson]);

    res.json({ lesson: lessonWithCommission });
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
