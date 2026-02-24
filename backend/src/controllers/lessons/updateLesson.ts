import { Response } from "express";
import { UpdateLessonDto } from "../../types";
import type { Lesson } from "@prisma/client";
import { AuthRequest } from "../../middleware/auth";
import { getWebSocketManager } from "../../lib/wsManager";
import prisma from "../../lib/prisma";
import { shiftFutureRecurringLessons } from "../../services/recurringHelpers";
import { updatePriceForFutureRecurringLessons } from "../../services/recurringHelpers";
import { truncateToMinute } from "../../utils/time";
import { findNextUnpaidLesson } from "./getCancellationInfo";
import { cancelRemindersForLesson, scheduleRemindersForLesson } from "../../services/reminderScheduler";

const validateUpdateData = async (
  id: string,
  userId: string,
  updateData: UpdateLessonDto,
  existingLesson: Lesson
) => {
  if (updateData.startTime || updateData.endTime) {
    if (existingLesson.status === "CANCELLED") {
      return {
        isValid: false,
        error:
          "Невозможно перенести отменённый урок. Сначала восстановите урок",
        statusCode: 400,
      };
    }
    const start = updateData.startTime
      ? truncateToMinute(new Date(updateData.startTime))
      : existingLesson.startTime;
    const end = updateData.endTime
      ? truncateToMinute(new Date(updateData.endTime))
      : existingLesson.endTime;

    if (start >= end) {
      return {
        isValid: false,
        error: "Время окончания должно быть позже времени начала",
      };
    }

    const conflictingLesson = await prisma.lesson.findFirst({
      where: {
        id: { not: id },
        tutorId: userId,
        status: { not: "CANCELLED" },
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (conflictingLesson) {
      return {
        isValid: false,
        error: "Временной слот конфликтует с существующим уроком",
        statusCode: 409,
      };
    }
  }

  if (updateData.price && updateData.price < 0) {
    return { isValid: false, error: "Цена должна быть положительной" };
  }

  if (updateData.grade && (updateData.grade < 1 || updateData.grade > 5)) {
    return { isValid: false, error: "Оценка должна быть от 1 до 5" };
  }

  return { isValid: true };
};

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const updateData: UpdateLessonDto = req.body;

    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingLesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    const validation = await validateUpdateData(
      id,
      userId!,
      updateData,
      existingLesson
    );
    if (!validation.isValid) {
      const statusCode = validation.statusCode || 400;
      return res.status(statusCode).json({ error: validation.error });
    }

    const now = truncateToMinute(new Date());

    const start = updateData.startTime
      ? truncateToMinute(new Date(updateData.startTime))
      : truncateToMinute(new Date(existingLesson.startTime));
    const end = updateData.endTime
      ? truncateToMinute(new Date(updateData.endTime))
      : truncateToMinute(new Date(existingLesson.endTime));

    let computedStatus: UpdateLessonDto["status"] | undefined = undefined;
    if (end.getTime() <= now.getTime() && updateData.status !== "CANCELLED") {
      computedStatus = "COMPLETED";
    } else if (
      start.getTime() <= now.getTime() &&
      end.getTime() > now.getTime() &&
      updateData.status !== "CANCELLED"
    ) {
      computedStatus = "IN_PROGRESS";
    } else {
      if (!updateData.status) {
        computedStatus =
          existingLesson.status === "CANCELLED" ? "CANCELLED" : undefined;
      }
    }

    const dataToUpdate = {
      ...updateData,
      ...(updateData.startTime ? { startTime: start } : {}),
      ...(updateData.endTime ? { endTime: end } : {}),
      ...(computedStatus ? { status: computedStatus } : {}),
    };

    if (
      updateData.status === "CANCELLED" &&
      existingLesson.isPaid &&
      existingLesson.paymentDate
    ) {
      const nextLesson = await findNextUnpaidLesson(userId!, existingLesson);

      if (nextLesson) {
        await prisma.lesson.update({
          where: { id: nextLesson.id },
          data: { isPaid: true, paymentDate: existingLesson.paymentDate },
        });
      }

      dataToUpdate.isPaid = false;
      delete dataToUpdate.paymentDate;
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: dataToUpdate,
      include: { student: { select: { id: true, name: true } } },
    });

    if (
      existingLesson.isRecurring &&
      (updateData.startTime || updateData.endTime) &&
      existingLesson.status === "SCHEDULED" &&
      updateData.status !== "RESCHEDULED"
    ) {
      const newStart = truncateToMinute(new Date(start));
      const newEnd = truncateToMinute(new Date(end));

      const result = await shiftFutureRecurringLessons(
        existingLesson,
        newStart,
        newEnd
      );
      if (result.conflicts && result.conflicts.length > 0) {
        throw new Error("Перенесенная серия конфликтует с другими уроками");
      } else if (result.shifted && result.shifted > 0) {
        console.log(`Shifted ${result.shifted} future recurring lessons`);
      }
    }

    if (
      existingLesson.isRecurring &&
      Object.prototype.hasOwnProperty.call(updateData, "price") &&
      existingLesson.status === "SCHEDULED" &&
      updateData.status !== "RESCHEDULED"
    ) {
      const newPrice = updateData.price ?? null;
      await updatePriceForFutureRecurringLessons(existingLesson, newPrice);
    }

    // Recalculate reminders if time or status changed
    const timeChanged = !!(updateData.startTime || updateData.endTime);
    const statusChanged = !!(updateData.status && updateData.status !== existingLesson.status);

    if (timeChanged || statusChanged) {
      await cancelRemindersForLesson(id);

      const newStatus = lesson.status;
      if (newStatus === "SCHEDULED" || newStatus === "RESCHEDULED") {
        await scheduleRemindersForLesson(id);
      }
    }

    res.json({
      message: "Урок успешно обновлен",
      lesson,
    });

    if (updateData.status && updateData.status !== existingLesson.status) {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          lesson.status,
          userId!
        );
      }
    }
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
