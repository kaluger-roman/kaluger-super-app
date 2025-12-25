import { createStore, createEvent, sample } from "effector";

import type { Lesson } from "../../types";

// Events
export const lessonDeleteDialogOpened = createEvent<Lesson>();
export const lessonDeleteDialogClosed = createEvent();
export const deleteAllFutureToggled = createEvent<boolean>();
export const deleteConfirmed = createEvent();

// Stores
export const $isOpen = createStore<boolean>(false);
export const $lesson = createStore<Lesson | undefined>(undefined, { skipVoid: false });
export const $deleteAllFuture = createStore<boolean>(false);
export const $isLoading = createStore<boolean>(false);

// Logic
sample({
  clock: lessonDeleteDialogOpened,
  fn: () => true,
  target: $isOpen,
});

sample({
  clock: lessonDeleteDialogOpened,
  target: $lesson,
});

sample({
  clock: lessonDeleteDialogClosed,
  fn: () => false,
  target: [$isOpen, $deleteAllFuture],
});

sample({
  clock: lessonDeleteDialogClosed,
  fn: () => undefined,
  target: $lesson,
});

sample({
  clock: deleteAllFutureToggled,
  target: $deleteAllFuture,
});
