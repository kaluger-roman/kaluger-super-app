import { createEffect, createEvent, createStore, sample } from "effector";

import { taxRatePeriodModel } from "@entities";
import type { TaxRatePeriod } from "@shared";
import { extractAxiosErrorMessage, notificationsModel, taxPeriodsApi } from "@shared";

import {
  addDraftPeriod,
  draftToCreatePayload,
  periodsToDraft,
  removeDraftPeriod,
  updateDraftRate,
  updateDraftStartDate,
} from "./tax-rate-periods-modal.helpers";
import type { DraftPeriod } from "./tax-rate-periods-modal.types";

// Stores
export const $isModalOpen = createStore(false);
export const $draftPeriods = createStore<DraftPeriod[]>([]);
export const $error = createStore<string>("");

// Events
export const modalOpened = createEvent();
export const modalClosed = createEvent();
export const periodAdded = createEvent();
export const periodStartDateChanged =
  createEvent<{ tempId: string; startDate: string }>();
export const periodRateChanged =
  createEvent<{ tempId: string; rate: number }>();
export const periodRemoved = createEvent<{ tempId: string }>();
export const saveRequested = createEvent();

// Effects
export const savePeriodsFx = createEffect(
  async (draft: DraftPeriod[]): Promise<TaxRatePeriod[]> =>
    taxPeriodsApi.replaceAll(draftToCreatePayload(draft)),
);

// Samples
sample({
  clock: modalOpened,
  fn: () => true,
  target: $isModalOpen,
});

sample({
  clock: modalOpened,
  source: taxRatePeriodModel.$periods,
  fn: periodsToDraft,
  target: $draftPeriods,
});

sample({
  clock: modalOpened,
  fn: () => "",
  target: $error,
});

sample({
  clock: modalClosed,
  fn: () => false,
  target: $isModalOpen,
});

sample({
  clock: modalClosed,
  fn: () => [] as DraftPeriod[],
  target: $draftPeriods,
});

sample({
  clock: periodAdded,
  source: $draftPeriods,
  fn: addDraftPeriod,
  target: $draftPeriods,
});

sample({
  clock: periodStartDateChanged,
  source: $draftPeriods,
  fn: updateDraftStartDate,
  target: $draftPeriods,
});

sample({
  clock: periodRateChanged,
  source: $draftPeriods,
  fn: updateDraftRate,
  target: $draftPeriods,
});

sample({
  clock: periodRemoved,
  source: $draftPeriods,
  fn: removeDraftPeriod,
  target: $draftPeriods,
});

sample({
  clock: saveRequested,
  source: $draftPeriods,
  target: savePeriodsFx,
});

sample({
  clock: savePeriodsFx.doneData,
  target: taxRatePeriodModel.periodsSet,
});

sample({
  clock: savePeriodsFx.done,
  fn: () => false,
  target: $isModalOpen,
});

sample({
  clock: savePeriodsFx.done,
  fn: () => "Налоговые периоды сохранены",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: savePeriodsFx.failData,
  fn: (error) => extractAxiosErrorMessage(error, "Не удалось сохранить периоды"),
  target: [$error, notificationsModel.showErrorEvent],
});
