import { createStore, createEvent, sample } from "effector";

// Events
export const paymentDialogOpened = createEvent<string>();
export const paymentDialogClosed = createEvent();
export const homeworkDialogOpened = createEvent<string>();
export const homeworkDialogClosed = createEvent();

export const $openPaymentDialogFor = createStore<string | null>(null);
export const $openHomeworkDialogFor = createStore<string | null>(null);

// Logic
sample({
  clock: paymentDialogOpened,
  fn: (lessonId: string) => lessonId,
  target: $openPaymentDialogFor,
});

sample({
  clock: paymentDialogClosed,
  fn: () => null,
  target: $openPaymentDialogFor,
});

sample({
  clock: homeworkDialogOpened,
  fn: (lessonId: string) => lessonId,
  target: $openHomeworkDialogFor,
});

sample({
  clock: homeworkDialogClosed,
  fn: () => null,
  target: $openHomeworkDialogFor,
});
