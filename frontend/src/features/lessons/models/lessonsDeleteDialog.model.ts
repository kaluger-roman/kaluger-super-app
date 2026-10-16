import { createStore, createEvent, sample } from "effector";

import type { Lesson } from "@shared";
import { lessonDeleteDialogModel, rescheduleDialogModel } from "@shared/ui";

// Events - Reschedule Dialog
export const rescheduleDialogOpened = createEvent<Lesson>();
export const rescheduleDialogClosed = createEvent();

// Events - Delete Dialog
export const deleteDialogOpened = createEvent<Lesson>();
export const deleteDialogClosed = createEvent();

// Stores - Reschedule Dialog
export const $isRescheduleDialogOpen = createStore<boolean>(false);
export const $reschedulingLesson = createStore<Lesson | undefined>(undefined, { skipVoid: false });

// Stores - Delete Dialog
export const $deleteDialogOpen = createStore<boolean>(false);
export const $selectedLesson = createStore<Lesson | null>(null);

// Logic - Reschedule Dialog
sample({
  clock: rescheduleDialogOpened,
  fn: () => true,
  target: $isRescheduleDialogOpen,
});

sample({
  clock: rescheduleDialogOpened,
  target: $reschedulingLesson,
});

sample({
  clock: rescheduleDialogClosed,
  fn: () => false,
  target: $isRescheduleDialogOpen,
});

sample({
  clock: rescheduleDialogClosed,
  fn: () => undefined,
  target: $reschedulingLesson,
});

// Logic - Delete Dialog
sample({
  clock: deleteDialogOpened,
  fn: () => true,
  target: $deleteDialogOpen,
});

sample({
  clock: deleteDialogOpened,
  target: $selectedLesson,
});

sample({
  clock: deleteDialogClosed,
  fn: () => false,
  target: $deleteDialogOpen,
});

sample({
  clock: deleteDialogClosed,
  fn: () => null,
  target: $selectedLesson,
});

sample({
  clock: deleteDialogOpened,
  target: lessonDeleteDialogModel.lessonDeleteDialogOpened,
});

sample({
  clock: deleteDialogClosed,
  target: lessonDeleteDialogModel.lessonDeleteDialogClosed,
});

sample({
  clock: rescheduleDialogOpened,
  target: rescheduleDialogModel.rescheduleDialogOpened,
});

sample({
  clock: rescheduleDialogClosed,
  target: rescheduleDialogModel.rescheduleDialogClosed,
});
