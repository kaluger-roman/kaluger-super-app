import { combine, createEvent, createStore, sample } from "effector";

import { toReceivedAmountInput, validateReceivedAmount } from "../../models";

export const paymentDialogOpened = createEvent<{ lessonId: string; price?: number }>();
export const paymentDialogClosed = createEvent();
export const receivedAmountChanged = createEvent<string>();
export const homeworkDialogOpened = createEvent<string>();
export const homeworkDialogClosed = createEvent();

export const $openPaymentDialogFor = createStore<string | null>(null);
export const $openHomeworkDialogFor = createStore<string | null>(null);
export const $receivedAmountInput = createStore<string>("");

export const $receivedAmountError = combine(
  $openPaymentDialogFor,
  $receivedAmountInput,
  (lessonId, input) => (lessonId === null ? null : validateReceivedAmount(input))
);

sample({
  clock: paymentDialogOpened,
  fn: ({ lessonId }) => lessonId,
  target: $openPaymentDialogFor,
});

sample({
  clock: paymentDialogOpened,
  fn: ({ price }) => toReceivedAmountInput(price),
  target: $receivedAmountInput,
});

sample({
  clock: receivedAmountChanged,
  target: $receivedAmountInput,
});

sample({
  clock: paymentDialogClosed,
  fn: () => null,
  target: $openPaymentDialogFor,
});

sample({
  clock: paymentDialogClosed,
  fn: () => "",
  target: $receivedAmountInput,
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
