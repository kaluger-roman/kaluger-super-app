import { createStore, createEvent, sample } from "effector";

// Events
export const confirmDialogOpened = createEvent<boolean>();
export const confirmDialogClosed = createEvent();

// Stores
export const $isOpen = createStore<boolean>(false);
export const $pendingStatus = createStore<boolean | null>(null);

// Logic
sample({
  clock: confirmDialogOpened,
  fn: () => true,
  target: $isOpen,
});

sample({
  clock: confirmDialogOpened,
  target: $pendingStatus,
});

sample({
  clock: confirmDialogClosed,
  fn: () => false,
  target: $isOpen,
});

sample({
  clock: confirmDialogClosed,
  fn: () => null,
  target: $pendingStatus,
});
