import { createEvent, sample, createStore, createEffect } from "effector";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";
import { formatDateLong, formatTime, lessonsApi } from "@shared";

import { confirmDialogOpened } from "./lessons-confirm-dialog.model";

export type CancellationInfo = {
  nextLessonId: string;
  nextLessonStartTime: string;
  nextLessonStudentName: string;
  transferAmount: number;
  transferDate: string;
} | null;

export const $cancellingLesson = createStore<Lesson | null>(null);
export const $cancellationInfo = createStore<CancellationInfo>(null);

export const lessonCancelRequested = createEvent<Lesson>();
export const lessonCancellationConfirmed = createEvent();

sample({
  clock: lessonCancelRequested,
  target: $cancellingLesson,
});

const getCancellationInfoFx = createEffect(async (lessonId: string): Promise<CancellationInfo> => {
  try {
    return await lessonsApi.getCancellationInfo(lessonId);
  } catch (error) {
    console.error("Failed to get cancellation info:", error);
    return null;
  }
});

sample({
  clock: lessonCancelRequested,
  fn: (lesson) => lesson.id,
  target: getCancellationInfoFx,
});

// Защита от гонки: при двойном клике на «Отменить» (быстро урок A, потом B)
// ответ медленного запроса A может прийти позже B, и без фильтра по params
// диалог откроется для B с финансовыми данными A. Сравниваем `params`
// (lesson id запроса) с текущим `$cancellingLesson` и отбрасываем устаревшие
// ответы.
sample({
  clock: getCancellationInfoFx.done,
  source: $cancellingLesson,
  filter: (cancellingLesson, { params }) => cancellingLesson?.id === params,
  fn: (_, { result }) => result,
  target: $cancellationInfo,
});

sample({
  clock: getCancellationInfoFx.done,
  source: $cancellingLesson,
  filter: (cancellingLesson, { params }) => cancellingLesson?.id === params,
  fn: (_, { result: cancellationInfo }) => {
    let message = "Вы уверены, что хотите отменить этот урок?";

    if (cancellationInfo) {
      const { nextLessonStartTime, nextLessonStudentName, transferAmount, transferDate } =
        cancellationInfo;

      const formattedDate = formatDateLong(nextLessonStartTime);
      const formattedTime = formatTime(nextLessonStartTime);
      const formattedTransferDate = formatDateLong(transferDate);

      message = `Вы уверены, что хотите отменить этот урок?\n\nОплата в размере ${transferAmount} ₽ от ${formattedTransferDate} будет перенесена на следующий урок:\n\n📅 ${formattedDate} в ${formattedTime}\n👤 ${nextLessonStudentName}`;
    }

    return {
      open: true,
      title: "Отменить урок",
      message,
      action: () => lessonCancellationConfirmed(),
      severity: "warning" as const,
    };
  },
  target: confirmDialogOpened,
});

sample({
  clock: lessonCancellationConfirmed,
  source: $cancellingLesson,
  filter: Boolean,
  fn: (lesson) => {
    if (!lesson) throw new Error("No lesson to cancel");
    return {
      id: lesson.id,
      data: { status: "CANCELLED" as const },
    };
  },
  target: lessonModel.updateLesson,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: $cancellingLesson,
  filter: (cancellingLesson, lesson) =>
    Boolean(
      cancellingLesson &&
        lesson &&
        cancellingLesson.id === lesson.id &&
        lesson.status === "CANCELLED",
    ),
  fn: () => null,
  target: [$cancellingLesson, $cancellationInfo],
});
