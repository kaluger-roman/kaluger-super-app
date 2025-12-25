import { createStore, createEvent, sample } from "effector";

// Events
export const paymentDialogOpened = createEvent();
export const paymentDialogClosed = createEvent();
export const homeworkDialogOpened = createEvent();
export const homeworkDialogClosed = createEvent();

// Stores
export const $isPaymentDialogOpen = createStore<boolean>(false);
export const $isHomeworkDialogOpen = createStore<boolean>(false);

// Logic
sample({
  clock: paymentDialogOpened,
  fn: () => true,
  target: $isPaymentDialogOpen,
});

sample({
  clock: paymentDialogClosed,
  fn: () => false,
  target: $isPaymentDialogOpen,
});

sample({
  clock: homeworkDialogOpened,
  fn: () => true,
  target: $isHomeworkDialogOpen,
});

sample({
  clock: homeworkDialogClosed,
  fn: () => false,
  target: $isHomeworkDialogOpen,
});
