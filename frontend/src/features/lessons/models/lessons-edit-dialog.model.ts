import { createStore, createEvent, sample } from "effector";

import type { Lesson } from "@shared";

// Events
export const dialogOpened = createEvent<Lesson | undefined>();
export const dialogClosed = createEvent();

// Stores
export const $isDialogOpen = createStore<boolean>(false);
export const $editingLesson = createStore<Lesson | undefined>(undefined, { skipVoid: false });

// Logic
sample({
  clock: dialogOpened,
  fn: () => true,
  target: $isDialogOpen,
});

sample({
  clock: dialogOpened,
  target: $editingLesson,
});

sample({
  clock: dialogClosed,
  fn: () => false,
  target: $isDialogOpen,
});

sample({
  clock: dialogClosed,
  fn: () => undefined,
  target: $editingLesson,
});
