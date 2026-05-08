import { createStore, createEvent, sample } from "effector";

import { calculatePresetDates } from "./lessons-filters.helpers";
import type { PaymentDatePreset } from "./lessons-filters.types";

export const setOnlyUnpaid = createEvent<boolean>();
export const setOnlyWithoutHomework = createEvent<boolean>();
export const setPaymentDateFrom = createEvent<Date | null>();
export const setPaymentDateTo = createEvent<Date | null>();
export const setPaymentDatePreset = createEvent<PaymentDatePreset>();
export const resetPaymentDateFilter = createEvent();

export const $onlyUnpaid = createStore<boolean>(false);
export const $onlyWithoutHomework = createStore<boolean>(false);
export const $paymentDateFrom = createStore<Date | null>(null);
export const $paymentDateTo = createStore<Date | null>(null);
export const $paymentDatePreset = createStore<PaymentDatePreset | null>(null);

const applyPresetDates = createEvent<{ from: Date; to: Date }>();

sample({
  clock: setOnlyUnpaid,
  target: $onlyUnpaid,
});

sample({
  clock: setOnlyWithoutHomework,
  target: $onlyWithoutHomework,
});

sample({
  clock: setPaymentDateFrom,
  target: $paymentDateFrom,
});

sample({
  clock: setPaymentDateTo,
  target: $paymentDateTo,
});

sample({
  clock: resetPaymentDateFilter,
  fn: () => null,
  target: [$paymentDateFrom, $paymentDateTo, $paymentDatePreset],
});

// Mutual exclusion: onlyUnpaid=true resets payment date filter
sample({
  clock: setOnlyUnpaid,
  filter: (checked) => checked,
  fn: () => null,
  target: [$paymentDateFrom, $paymentDateTo, $paymentDatePreset],
});

// Manual date change resets preset (only fires for manual setPaymentDateFrom/To events)
sample({
  clock: [setPaymentDateFrom, setPaymentDateTo],
  fn: () => null,
  target: $paymentDatePreset,
});

// Preset selection: calculate dates and apply via internal event
sample({
  clock: setPaymentDatePreset,
  fn: calculatePresetDates,
  target: applyPresetDates,
});

// Apply preset dates to stores (bypasses setPaymentDateFrom/To events → doesn't reset preset)
sample({
  clock: applyPresetDates,
  fn: ({ from }) => from,
  target: $paymentDateFrom,
});

sample({
  clock: applyPresetDates,
  fn: ({ to }) => to,
  target: $paymentDateTo,
});

// Set preset store value
sample({
  clock: setPaymentDatePreset,
  target: $paymentDatePreset,
});
