import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { userModel } from "@entities";
import { toLocalStartOfDay, toLocalEndOfDay } from "@features";
import type { Statistics } from "@shared";
import { statisticsApi } from "@shared";

import type { ReportsPeriod } from "./statistics.types";

export const ReportsPageGate = createGate();

export const startDateChanged = createEvent<Date | null>();
export const endDateChanged = createEvent<Date | null>();
export const statisticsLoadRequested = createEvent();
export const periodApplied = createEvent<ReportsPeriod>();

export const $statistics = createStore<Statistics | null>(null);
export const $startDate = createStore<Date>(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);
export const $endDate = createStore<Date>(new Date());
export const $isLoading = createStore<boolean>(false);
export const $error = createStore<string | null>(null);
// The period the cards and the history were loaded for; the date fields may
// already differ until «Обновить» is pressed.
export const $appliedRange = createStore<ReportsPeriod | null>(null);

export const loadStatisticsFx = createEffect(
  async (params: { startDate?: string; endDate?: string }) => {
    const response = await statisticsApi.getStatistics(params);
    return response.data as Statistics;
  }
);

sample({
  clock: startDateChanged,
  fn: (date) => date || new Date(),
  target: $startDate,
});

sample({
  clock: endDateChanged,
  fn: (date) => date || new Date(),
  target: $endDate,
});

sample({
  clock: loadStatisticsFx,
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: loadStatisticsFx.finally,
  fn: () => false,
  target: $isLoading,
});

sample({
  clock: loadStatisticsFx.doneData,
  target: $statistics,
});

sample({
  clock: loadStatisticsFx.fail,
  fn: () => "Не удалось загрузить статистику",
  target: $error,
});

sample({
  clock: loadStatisticsFx,
  fn: () => null,
  target: $error,
});

sample({
  clock: [ReportsPageGate.open, statisticsLoadRequested],
  source: { startDate: $startDate, endDate: $endDate },
  fn: ({ startDate, endDate }) => ({
    startDate: toLocalStartOfDay(startDate),
    endDate: toLocalEndOfDay(endDate),
  }),
  target: periodApplied,
});

sample({ clock: periodApplied, target: [$appliedRange, loadStatisticsFx] });

sample({
  clock: [userModel.logoutUser, userModel.tutorSessionCleared],
  fn: () => null,
  target: [$statistics, $appliedRange, $error],
});
