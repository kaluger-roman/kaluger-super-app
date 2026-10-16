import { createStore, createEvent, createEffect, sample } from "effector";

import type { TaxRatePeriod } from "@shared";
import { taxPeriodsApi } from "@shared";

export const $periods = createStore<TaxRatePeriod[]>([]);

export const periodsRequested = createEvent();
export const periodsSet = createEvent<TaxRatePeriod[]>();

export const loadPeriodsFx = createEffect(async () => {
  return await taxPeriodsApi.list();
});

sample({
  clock: periodsRequested,
  target: loadPeriodsFx,
});

sample({
  clock: loadPeriodsFx.doneData,
  target: $periods,
});

sample({
  clock: periodsSet,
  target: $periods,
});
