import { createEvent, sample, createStore } from "effector";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";
import { lessonDeleteDialogModel, rescheduleDialogModel } from "@shared/ui";

import { confirmDialogOpened } from "./lessons-confirm-dialog.model";
import { deleteDialogClosed, rescheduleDialogClosed } from "./lessons-delete-dialog.model";
import { $viewingLesson, restoreFromViewRequested } from "./lessons-view-dialog.model";

export const $isLoading = createStore<boolean>(false);
export const $isRescheduling = createStore<boolean>(false);

// Events
export const lessonRestoreRequested = createEvent<Lesson>();
export const lessonRescheduleRequested = createEvent<{
  lesson: Lesson;
  newStartTime: Date;
  newEndTime: Date;
}>();
export const lessonRescheduleRequestedFromDialog = createEvent<{
  newStartTime: Date;
  newEndTime: Date;
}>();
export const lessonDeleteRequested = createEvent<{
  lesson: Lesson;
  deleteAllFuture?: boolean;
}>();
export const lessonDeleteRequestedFromDialog = createEvent<{
  deleteAllFuture?: boolean;
}>();
export const lessonPaymentChanged = createEvent<{
  lessonId: string;
  isPaid: boolean;
  paymentDate?: string;
}>();
export const lessonHomeworkSentChanged = createEvent<{
  lessonId: string;
  isSent: boolean;
}>();

// Restore lesson with confirmation
sample({
  clock: lessonRestoreRequested,
  fn: (lesson) => ({
    open: true,
    title: "Восстановить урок",
    message: "Вы уверены, что хотите восстановить этот урок?",
    action: () => {
      lessonModel.updateLesson({
        id: lesson.id,
        data: { status: "SCHEDULED" },
      });
    },
    severity: "info" as const,
  }),
  target: confirmDialogOpened,
});

// Reschedule lesson - directly update
sample({
  clock: lessonRescheduleRequested,
  fn: ({ lesson, newStartTime, newEndTime }) => ({
    id: lesson.id,
    data: {
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      status: "RESCHEDULED" as const,
    },
  }),
  target: lessonModel.updateLesson,
});

// Reschedule from dialog
sample({
  clock: lessonRescheduleRequestedFromDialog,
  source: { lesson: rescheduleDialogModel.$lesson },
  filter: ({ lesson }) => Boolean(lesson),
  fn: ({ lesson }, { newStartTime, newEndTime }) => ({
    lesson: lesson as Lesson,
    newStartTime,
    newEndTime,
  }),
  target: lessonRescheduleRequested,
});

sample({
  clock: lessonRescheduleRequested,
  fn: () => true,
  target: $isRescheduling,
});

// Delete lesson - directly remove
sample({
  clock: lessonDeleteRequested,
  fn: ({ lesson, deleteAllFuture }) => ({
    id: lesson.id,
    deleteAllFuture,
  }),
  target: lessonModel.removeLesson,
});

// Delete from dialog
sample({
  clock: lessonDeleteRequestedFromDialog,
  source: { lesson: lessonDeleteDialogModel.$lesson },
  filter: ({ lesson }) => Boolean(lesson),
  fn: ({ lesson }, { deleteAllFuture }) => ({
    lesson: lesson as Lesson,
    deleteAllFuture,
  }),
  target: lessonDeleteRequested,
});

// Update payment status - directly update
sample({
  clock: lessonPaymentChanged,
  fn: ({ lessonId, isPaid, paymentDate }) => ({
    id: lessonId,
    data: {
      isPaid,
      paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
    },
  }),
  target: lessonModel.updateLesson,
});

// Update homework sent status - directly update
sample({
  clock: lessonHomeworkSentChanged,
  fn: ({ lessonId, isSent }) => ({
    id: lessonId,
    data: { isHomeworkSentByTeacher: isSent },
  }),
  target: lessonModel.updateLesson,
});

// Connect view dialog restore action
sample({
  clock: restoreFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  target: lessonRestoreRequested,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  target: rescheduleDialogClosed,
});

sample({
  clock: lessonModel.updateLessonFx.finally,
  fn: () => false,
  target: $isRescheduling,
});

sample({
  clock: lessonModel.removeLessonFx.doneData,
  target: deleteDialogClosed,
});

sample({
  clock: lessonModel.removeLessonFx.pending,
  target: lessonDeleteDialogModel.$isLoading,
});
