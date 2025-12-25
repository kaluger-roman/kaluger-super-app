import { createStore, createEvent, sample } from "effector";

export const $deleteDialogOpen = createStore(false);

export const deleteDialogOpened = createEvent();
export const deleteDialogClosed = createEvent();

sample({
  clock: deleteDialogOpened,
  fn: () => true,
  target: $deleteDialogOpen,
});

sample({
  clock: deleteDialogClosed,
  fn: () => false,
  target: $deleteDialogOpen,
});
