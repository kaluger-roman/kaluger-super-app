import type { Response } from "express";
import type { UpdateLessonDto } from "../../types";
import type { AuthRequest } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";
import {
  applyLessonUpdate,
  buildLessonUpdateData,
  notifyLessonUpdated,
  syncAfterLessonUpdate,
} from "../../services";
import {
  RecurringShiftConflictError,
  SchedulingConflictError,
} from "../../utils";
import { findNextUnpaidLesson } from "./getCancellationInfo";
import { validateUpdateData } from "./updateLesson.validators";

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const updateData: UpdateLessonDto = req.body;

    const existingLesson = await prisma.lesson.findFirst({
      where: { id, tutorId: userId },
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

    const { dataToUpdate, start, end } = buildLessonUpdateData(
      updateData,
      existingLesson,
      isLinkingStudent,
    );

    let nextLessonForTransfer: Awaited<
      ReturnType<typeof findNextUnpaidLesson>
    > = null;
    if (
      updateData.status === "CANCELLED" &&
      existingLesson.isPaid &&
      existingLesson.paymentDate
    ) {
      // Перенос оплаты возможен только для урока с учеником — у пробного
      // урока без ученика очереди уроков нет, но сброс оплаты нужен всегда.
      if (existingLesson.studentId) {
        nextLessonForTransfer = await findNextUnpaidLesson(
          userId,
          existingLesson,
        );
      }
      dataToUpdate.isPaid = false;
      // Prisma treats `undefined` as "do not update this field". Use explicit
      // `null` so paymentDate is actually cleared on the cancelled lesson —
      // otherwise the row ends up with isPaid=false but a stale paymentDate.
      dataToUpdate.paymentDate = null;
    }

    const updateResult = await applyLessonUpdate({
      id,
      userId,
      existingLesson,
      updateData,
      dataToUpdate,
      start,
      end,
      nextLessonForTransfer,
    });

    await syncAfterLessonUpdate(id, existingLesson, updateData, updateResult);

    res.json({ message: "Урок успешно обновлен", lesson: updateResult.lesson });

    notifyLessonUpdated(
      userId,
      existingLesson,
      updateData,
      updateResult.lesson,
      updateResult.plannedShift,
    );
  } catch (error) {
    if (
      error instanceof SchedulingConflictError ||
      error instanceof RecurringShiftConflictError
    ) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Update lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
