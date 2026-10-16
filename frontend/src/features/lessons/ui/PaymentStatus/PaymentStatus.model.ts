import { combine, createEvent, createStore, sample } from "effector";

import { toReceivedAmountInput, validateReceivedAmount } from "../../models";

export const confirmDialogOpened = createEvent<{ isPaid: boolean; price?: number }>();
export const confirmDialogClosed = createEvent();
export const receivedAmountChanged = createEvent<string>();

export const $isOpen = createStore<boolean>(false);
export const $pendingStatus = createStore<boolean | null>(null);
export const $receivedAmountInput = createStore<string>("");

export const $receivedAmountError = combine(
  $pendingStatus,
  $receivedAmountInput,
  (pendingStatus, input) => (pendingStatus === true ? validateReceivedAmount(input) : null)
);

sample({
  clock: confirmDialogOpened,
  fn: () => true,
  target: $isOpen,
});

sample({
  clock: confirmDialogOpened,
  fn: ({ isPaid }) => isPaid,
  target: $pendingStatus,
});

sample({
  clock: confirmDialogOpened,
  fn: ({ price }) => toReceivedAmountInput(price),
  target: $receivedAmountInput,
});

sample({
  clock: receivedAmountChanged,
  target: $receivedAmountInput,
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

sample({
  clock: confirmDialogClosed,
  fn: () => "",
  target: $receivedAmountInput,
});
