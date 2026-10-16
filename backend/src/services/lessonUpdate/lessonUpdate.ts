import type { Lesson } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getWebSocketManager } from "../../lib/wsManager";
import type { ShiftResult, UpdateLessonDto } from "../../types";
import { RecurringShiftConflictError, SchedulingConflictError } from "../../utils";
import { truncateToMinute } from "../../utils/time";
import {
  applyShiftFutureRecurringLessons,
  previewShiftFutureRecurringLessons,
  updatePriceForFutureRecurringLessons,
} from "../recurringHelpers";
import type { ShiftPreview } from "../recurringHelpers";
import { cancelRemindersForLesson, scheduleRemindersForLesson } from "../reminderScheduler";
import { broadcastStudentLessonUpdated } from "../studentLessonBroadcast";
import { LESSON_UPDATE_LOCK_NAMESPACE, MAX_TX_RETRIES } from "./lessonUpdate.constants";
import {
  isTimeChanging,
  shouldPropagateRecurringPrice,
  shouldShiftRecurringSeries,
} from "./lessonUpdate.helpers";
import type {
  ApplyLessonUpdateParams,
  LessonUpdateResult,
  UpdatedLesson,
} from "./lessonUpdate.types";

// A per-tutor advisory lock serializes concurrent updates of one tutor, so two
// overlapping requests cannot both pass the conflict-check `findFirst` and both
// commit overlapping lessons. Serializable isolation gave the same guarantee
// but aborted unrelated tutors too: its predicate locks on btree indexes are
// page-sized, and recent lessons (time-ordered cuids) share index pages.
const runLessonUpdateTransaction = ({
  id,
  userId,
  existingLesson,
  updateData,
  dataToUpdate,
  start,
  end,
  nextLessonForTransfer,
}: ApplyLessonUpdateParams): Promise<LessonUpdateResult> =>
  prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LESSON_UPDATE_LOCK_NAMESPACE}::int4, hashtext(${userId}))`;

    if (isTimeChanging(updateData)) {
      const conflictingLesson = await tx.lesson.findFirst({
        where: {
          id: { not: id },
          tutorId: userId,
          status: { not: "CANCELLED" },
          OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
        },
      });
      if (conflictingLesson) {
        throw new SchedulingConflictError("Временной слот конфликтует с существующим уроком");
      }
    }

    let plannedShift: ShiftPreview | undefined;
    if (shouldShiftRecurringSeries(updateData, existingLesson)) {
      plannedShift = await previewShiftFutureRecurringLessons(
        existingLesson,
        truncateToMinute(new Date(start)),
        truncateToMinute(new Date(end)),
        tx
      );
      if (plannedShift.conflicts.length > 0) {
        throw new RecurringShiftConflictError("Перенесенная серия конфликтует с другими уроками");
      }
    }

    if (nextLessonForTransfer && existingLesson.paymentDate) {
      await tx.lesson.update({
        where: { id: nextLessonForTransfer.id },
        data: {
          isPaid: true,
          paymentDate: existingLesson.paymentDate,
          receivedAmount: existingLesson.receivedAmount ?? existingLesson.price ?? 0,
        },
      });
    }

    const lesson = await tx.lesson.update({
      where: { id },
      data: dataToUpdate,
      include: { student: { select: { id: true, name: true } } },
    });

    const result: ShiftResult | undefined = plannedShift
      ? await applyShiftFutureRecurringLessons(tx, plannedShift.planned)
      : undefined;

    return { lesson, result, plannedShift };
  });

export const applyLessonUpdate = async (
  params: ApplyLessonUpdateParams
): Promise<LessonUpdateResult> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await runLessonUpdateTransaction(params);
    } catch (err) {
      const prismaCode = (err as { code?: string }).code;
      if (prismaCode !== "P2034" || attempt >= MAX_TX_RETRIES) {
        throw err;
      }
      // Jittered exponential-ish backoff before retrying the transaction.
      await new Promise((r) => setTimeout(r, 10 * attempt + Math.floor(Math.random() * 20)));
    }
  }
};

export const syncAfterLessonUpdate = async (
  id: string,
  existingLesson: Lesson,
  updateData: UpdateLessonDto,
  { lesson, result }: LessonUpdateResult
) => {
  if (result?.shifted && result.shifted > 0) {
    console.log(`Shifted ${result.shifted} future recurring lessons`);
    for (const shiftedId of result.shiftedIds ?? []) {
      await cancelRemindersForLesson(shiftedId);
      await scheduleRemindersForLesson(shiftedId);
    }
  }

  if (shouldPropagateRecurringPrice(updateData, existingLesson)) {
    await updatePriceForFutureRecurringLessons(existingLesson, updateData.price ?? null);
  }

  const statusChanged = !!updateData.status && updateData.status !== existingLesson.status;
  const alreadyRecalculated = result?.shiftedIds?.includes(id);

  if ((isTimeChanging(updateData) || statusChanged) && !alreadyRecalculated) {
    await cancelRemindersForLesson(id);
    if (lesson.status === "SCHEDULED" || lesson.status === "RESCHEDULED") {
      await scheduleRemindersForLesson(id);
    }
  }
};

export const notifyLessonUpdated = (
  userId: string,
  existingLesson: Lesson,
  updateData: UpdateLessonDto,
  lesson: UpdatedLesson,
  plannedShift: ShiftPreview | undefined
) => {
  if (updateData.status && updateData.status !== existingLesson.status) {
    getWebSocketManager()?.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
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
  for (const planned of plannedShift?.planned ?? []) {
    if (planned.original.id === lesson.id) continue;
    void broadcastStudentLessonUpdated({
      id: planned.original.id,
      subject: planned.original.subject,
      startTime: planned.shiftedStart,
      endTime: planned.shiftedEnd,
      status: planned.original.status,
    });
  }
};
