import { createEvent, sample, createStore } from "effector";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";

import { confirmDialogOpened } from "./lessons-confirm-dialog.model";
import {
  $viewingLesson,
  cancelFromViewRequested,
  restoreFromViewRequested,
} from "./lessons-view-dialog.model";

export const $isLoading = createStore<boolean>(false);

// Events
export const lessonCancelRequested = createEvent<Lesson>();
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
}>();
export const lessonHomeworkSentChanged = createEvent<{
  lessonId: string;
  isSent: boolean;
}>();

// Cancel lesson with confirmation
sample({
  clock: lessonCancelRequested,
  fn: (lesson) => ({
    open: true,
    title: "Отменить урок",
    message: "Вы уверены, что хотите отменить этот урок?",
    action: () => {
      lessonModel.updateLesson({
        id: lesson.id,
        data: { status: "CANCELLED" },
      });
    },
    severity: "warning" as const,
  }),
  target: confirmDialogOpened,
});

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
  source: { lesson: $viewingLesson },
  filter: ({ lesson }) => Boolean(lesson),
  fn: ({ lesson }, { newStartTime, newEndTime }) => ({
    lesson: lesson as Lesson,
    newStartTime,
    newEndTime,
  }),
  target: lessonRescheduleRequested,
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
  source: { lesson: $viewingLesson },
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
  fn: ({ lessonId, isPaid }) => ({
    id: lessonId,
    data: { isPaid },
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

// Connect view dialog actions to lesson actions
sample({
  clock: cancelFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  target: lessonCancelRequested,
});

sample({
  clock: restoreFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  target: lessonRestoreRequested,
});
