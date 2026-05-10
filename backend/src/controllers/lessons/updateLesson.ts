import type { Response } from "express";
import type { UpdateLessonDto } from "../../types";
import type { Lesson } from "@prisma/client";
import type { AuthRequest } from "../../middleware/auth";
import { getWebSocketManager } from "../../lib/wsManager";
import prisma from "../../lib/prisma";
import {
  previewShiftFutureRecurringLessons,
  applyShiftFutureRecurringLessons,
  updatePriceForFutureRecurringLessons,
  cancelRemindersForLesson,
  scheduleRemindersForLesson,
} from "../../services";
import {
  SchedulingConflictError,
  RecurringShiftConflictError,
} from "../../utils";
import { truncateToMinute } from "../../utils/time";
import { findNextUnpaidLesson } from "./getCancellationInfo";
import type { ShiftResult } from "../../types";

const validateUpdateData = (
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

    const validation = validateUpdateData(updateData, existingLesson);
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

    let nextLessonForTransfer: Awaited<ReturnType<typeof findNextUnpaidLesson>> = null;
    if (
      updateData.status === "CANCELLED" &&
      existingLesson.isPaid &&
      existingLesson.paymentDate
    ) {
      nextLessonForTransfer = await findNextUnpaidLesson(userId!, existingLesson);
      dataToUpdate.isPaid = false;
      // Prisma treats `undefined` as "do not update this field". Use explicit
      // `null` so paymentDate is actually cleared on the cancelled lesson —
      // otherwise the row ends up with isPaid=false but a stale paymentDate.
      dataToUpdate.paymentDate = null;
    }

    const shouldShiftRecurring =
      existingLesson.isRecurring &&
      (updateData.startTime || updateData.endTime) &&
      existingLesson.status === "SCHEDULED" &&
      updateData.status !== "RESCHEDULED";

    const timeChanging = !!(updateData.startTime || updateData.endTime);

    let lesson: Awaited<ReturnType<typeof prisma.lesson.update>>;
    let result: ShiftResult | undefined;
    try {
      const txResult = await prisma.$transaction(async (tx) => {
        // Conflict check inside transaction prevents TOCTOU between read
        // and write — concurrent updates can no longer slip through after
        // both pass the precheck.
        if (timeChanging) {
          const conflictingLesson = await tx.lesson.findFirst({
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
            throw new SchedulingConflictError(
              "Временной слот конфликтует с существующим уроком"
            );
          }
        }

        let plannedShift:
          | Awaited<ReturnType<typeof previewShiftFutureRecurringLessons>>
          | undefined;
        if (shouldShiftRecurring) {
          const newStart = truncateToMinute(new Date(start));
          const newEnd = truncateToMinute(new Date(end));
          plannedShift = await previewShiftFutureRecurringLessons(
            existingLesson,
            newStart,
            newEnd,
            tx
          );

          if (plannedShift.conflicts.length > 0) {
            throw new RecurringShiftConflictError(
              "Перенесенная серия конфликтует с другими уроками"
            );
          }
        }

        if (nextLessonForTransfer && existingLesson.paymentDate) {
          await tx.lesson.update({
            where: { id: nextLessonForTransfer.id },
            data: { isPaid: true, paymentDate: existingLesson.paymentDate },
          });
        }
        const updated = await tx.lesson.update({
          where: { id },
          data: dataToUpdate,
          include: { student: { select: { id: true, name: true } } },
        });

        const shiftResult: ShiftResult | undefined = plannedShift
          ? await applyShiftFutureRecurringLessons(tx, plannedShift.planned)
          : undefined;

        return { lesson: updated, result: shiftResult };
      });
      lesson = txResult.lesson;
      result = txResult.result;
    } catch (err) {
      if (err instanceof SchedulingConflictError) {
        return res.status(409).json({ error: err.message });
      }
      if (err instanceof RecurringShiftConflictError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }

    if (result?.shifted && result.shifted > 0) {
      console.log(`Shifted ${result.shifted} future recurring lessons`);

      // Recalculate reminders for all shifted lessons
      if (result.shiftedIds) {
        for (const shiftedId of result.shiftedIds) {
          await cancelRemindersForLesson(shiftedId);
          await scheduleRemindersForLesson(shiftedId);
        }
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

    // Recalculate reminders if time or status changed (skip if already handled by shift loop)
    const timeChanged = !!(updateData.startTime || updateData.endTime);
    const statusChanged = !!(updateData.status && updateData.status !== existingLesson.status);
    const alreadyRecalculated = result?.shiftedIds?.includes(id);

    if ((timeChanged || statusChanged) && !alreadyRecalculated) {
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
