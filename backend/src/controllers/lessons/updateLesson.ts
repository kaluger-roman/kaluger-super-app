import type { Response } from "express";
import { Prisma } from "@prisma/client";
import type { Lesson } from "@prisma/client";
import type { UpdateLessonDto } from "../../types";
import type { AuthRequest } from "../../middleware/auth";
import { getWebSocketManager } from "../../lib/wsManager";
import prisma from "../../lib/prisma";
import {
  applyShiftFutureRecurringLessons,
  broadcastStudentLessonUpdated,
  cancelRemindersForLesson,
  previewShiftFutureRecurringLessons,
  scheduleRemindersForLesson,
  updatePriceForFutureRecurringLessons,
} from "../../services";
import {
  SchedulingConflictError,
  RecurringShiftConflictError,
} from "../../utils";
import { truncateToMinute } from "../../utils/time";
import { findNextUnpaidLesson } from "./getCancellationInfo";
import { CONTACT_METHODS } from "./validators";
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

  if ("studentId" in updateData && !updateData.studentId) {
    return { isValid: false, error: "Нельзя отвязать ученика от урока" };
  }

  const hasProspectFields =
    "prospectName" in updateData ||
    "prospectPhone" in updateData ||
    "prospectContactMethod" in updateData;

  if (hasProspectFields && (existingLesson.studentId || updateData.studentId)) {
    return {
      isValid: false,
      error: "Данные пробного ученика нельзя указывать вместе с учеником",
    };
  }

  if ("prospectName" in updateData && !updateData.prospectName?.trim()) {
    return {
      isValid: false,
      error: "Имя ученика для пробного урока обязательно",
    };
  }

  if (
    updateData.prospectContactMethod !== undefined &&
    !CONTACT_METHODS.includes(updateData.prospectContactMethod)
  ) {
    return {
      isValid: false,
      error: "Недопустимый способ связи (WhatsApp, Telegram или MAX)",
    };
  }

  if (
    updateData.isRecurring &&
    !existingLesson.studentId &&
    !updateData.studentId
  ) {
    return {
      isValid: false,
      error: "Пробный урок без ученика не может быть повторяющимся",
    };
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

    if (updateData.studentId) {
      const student = await prisma.student.findFirst({
        where: { id: updateData.studentId, tutorId: userId },
      });
      if (!student) {
        return res.status(404).json({ error: "Ученик не найден" });
      }
    }
    const isLinkingStudent =
      !!updateData.studentId && !existingLesson.studentId;

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
      ...(updateData.prospectName !== undefined
        ? { prospectName: updateData.prospectName.trim() }
        : {}),
      ...(isLinkingStudent
        ? { prospectName: null, prospectPhone: null, prospectContactMethod: null }
        : {}),
    };

    let nextLessonForTransfer: Awaited<ReturnType<typeof findNextUnpaidLesson>> = null;
    if (
      updateData.status === "CANCELLED" &&
      existingLesson.isPaid &&
      existingLesson.paymentDate
    ) {
      // Перенос оплаты возможен только для урока с учеником — у пробного
      // урока без ученика очереди уроков нет, но сброс оплаты нужен всегда.
      if (existingLesson.studentId) {
        nextLessonForTransfer = await findNextUnpaidLesson(userId!, existingLesson);
      }
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
    let plannedShift:
      | Awaited<ReturnType<typeof previewShiftFutureRecurringLessons>>
      | undefined;
    // Serializable isolation + bounded retry on P2034 (transaction conflict /
    // serialization failure) gives a true TOCTOU guarantee for concurrent
    // updates on the same tutor. Default READ COMMITTED would let two
    // overlapping requests both pass the conflict-check `findFirst` and both
    // commit overlapping lessons — moving the check inside `$transaction`
    // alone is not enough.
    const MAX_TX_RETRIES = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const txResult = await prisma.$transaction(
          async (tx) => {
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

            let txPlannedShift:
              | Awaited<ReturnType<typeof previewShiftFutureRecurringLessons>>
              | undefined;
            if (shouldShiftRecurring) {
              const newStart = truncateToMinute(new Date(start));
              const newEnd = truncateToMinute(new Date(end));
              txPlannedShift = await previewShiftFutureRecurringLessons(
                existingLesson,
                newStart,
                newEnd,
                tx
              );

              if (txPlannedShift.conflicts.length > 0) {
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

            const shiftResult: ShiftResult | undefined = txPlannedShift
              ? await applyShiftFutureRecurringLessons(tx, txPlannedShift.planned)
              : undefined;

            return {
              lesson: updated,
              result: shiftResult,
              plannedShift: txPlannedShift,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        lesson = txResult.lesson;
        result = txResult.result;
        plannedShift = txResult.plannedShift;
        break;
      } catch (err) {
        if (err instanceof SchedulingConflictError) {
          return res.status(409).json({ error: err.message });
        }
        if (err instanceof RecurringShiftConflictError) {
          return res.status(409).json({ error: err.message });
        }
        const prismaCode = (err as { code?: string }).code;
        if (prismaCode === "P2034" && attempt < MAX_TX_RETRIES) {
          // Jittered exponential-ish backoff before retrying the transaction.
          await new Promise((r) =>
            setTimeout(r, 10 * attempt + Math.floor(Math.random() * 20))
          );
          continue;
        }
        throw err;
      }
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

    void broadcastStudentLessonUpdated({
      id: lesson.id,
      subject: lesson.subject,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      status: lesson.status,
    });

    // Также сообщаем ученику о каждом сдвинутом уроке серии — иначе у него
    // в расписании останутся старые времена для всех уроков, кроме базового.
    if (plannedShift?.planned) {
      for (const planned of plannedShift.planned) {
        if (planned.original.id === lesson.id) continue;
        void broadcastStudentLessonUpdated({
          id: planned.original.id,
          subject: planned.original.subject,
          startTime: planned.shiftedStart,
          endTime: planned.shiftedEnd,
          status: planned.original.status,
        });
      }
    }
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
