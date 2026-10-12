import { combine, createEffect, createEvent, createStore, sample } from "effector";

import { userModel } from "@entities";
import type { IncomeHistory } from "@shared";
import { statisticsApi } from "@shared";

import {
  INCOME_HISTORY_LOAD_ERROR,
  INCOME_HISTORY_NEXT_PAGE_ERROR,
} from "./incomeHistory.constants";
import {
  appendIncomeHistoryPage,
  buildNextPageParams,
  isNextPageReady,
} from "./incomeHistory.helpers";
import type {
  IncomeHistoryRequest,
  LoadIncomeHistoryParams,
  LoadNextPageParams,
} from "./incomeHistory.types";
import * as statisticsModel from "./statistics.model";
import type { ReportsPeriod } from "./statistics.types";

export const $incomeHistory = createStore<IncomeHistory | null>(null);
export const $incomeHistoryError = createStore<string | null>(null);
export const $nextPageError = createStore<string | null>(null);
// Bumped by every first-page request; responses of an older generation are dropped.
export const $historyVersion = createStore(0);
// Period of the loaded history: the applied range moves on before the new period arrives.
export const $historyRange = createStore<ReportsPeriod | null>(null);
// Version of the history the in-flight page belongs to: an outdated request must not
// keep the button of a freshly loaded history in the loading state.
const $nextPageVersion = createStore<number | null>(null);

export const $isNextPageLoading = combine(
  $nextPageVersion,
  $historyVersion,
  (pageVersion, version) => pageVersion === version
);

export const incomeHistoryRequested = createEvent<IncomeHistoryRequest>();
export const incomeHistoryNextPageRequested = createEvent();

export const loadIncomeHistoryFx = createEffect(
  async ({ startDate, endDate, through }: LoadIncomeHistoryParams) => {
    const response = await statisticsApi.getIncomeHistory({ startDate, endDate, through });
    return response.data;
  }
);

export const loadNextPageFx = createEffect(
  async ({ startDate, endDate, before }: LoadNextPageParams) => {
    const response = await statisticsApi.getIncomeHistory({ startDate, endDate, before });
    return response.data;
  }
);

sample({ clock: statisticsModel.periodApplied, target: incomeHistoryRequested });

const versionedRequest = sample({
  clock: incomeHistoryRequested,
  source: $historyVersion,
  fn: (version, request): LoadIncomeHistoryParams => ({ ...request, version: version + 1 }),
});

sample({ clock: versionedRequest, fn: ({ version }) => version, target: $historyVersion });
sample({ clock: versionedRequest, target: loadIncomeHistoryFx });

const freshHistoryLoaded = sample({
  clock: loadIncomeHistoryFx.done,
  source: $historyVersion,
  filter: (version, { params }) => params.version === version,
  fn: (_, { result }) => result,
});

sample({ clock: freshHistoryLoaded, target: $incomeHistory });
sample({
  clock: loadIncomeHistoryFx.done,
  source: $historyVersion,
  filter: (version, { params }) => params.version === version,
  fn: (_, { params: { startDate, endDate } }): ReportsPeriod => ({ startDate, endDate }),
  target: $historyRange,
});
sample({
  clock: freshHistoryLoaded,
  fn: () => null,
  target: [$incomeHistoryError, $nextPageError],
});

sample({
  clock: loadIncomeHistoryFx.fail,
  source: $historyVersion,
  filter: (version, { params }) => params.version === version,
  fn: () => INCOME_HISTORY_LOAD_ERROR,
  target: $incomeHistoryError,
});

sample({
  clock: incomeHistoryNextPageRequested,
  source: {
    history: $incomeHistory,
    range: statisticsModel.$appliedRange,
    version: $historyVersion,
    isNextPageLoading: $isNextPageLoading,
    isFirstPageLoading: loadIncomeHistoryFx.pending,
  },
  filter: isNextPageReady,
  fn: buildNextPageParams,
  target: loadNextPageFx,
});

sample({ clock: loadNextPageFx, fn: () => null, target: $nextPageError });
sample({ clock: loadNextPageFx, fn: ({ version }) => version, target: $nextPageVersion });
sample({
  clock: loadNextPageFx.finally,
  source: $nextPageVersion,
  filter: (pageVersion, { params }) => pageVersion === params.version,
  fn: () => null,
  target: $nextPageVersion,
});

sample({
  clock: loadNextPageFx.done,
  source: { history: $incomeHistory, version: $historyVersion },
  filter: ({ version }, { params }) => params.version === version,
  fn: ({ history }, { result }) => appendIncomeHistoryPage(history, result),
  target: $incomeHistory,
});

sample({
  clock: loadNextPageFx.fail,
  source: $historyVersion,
  filter: (version, { params }) => params.version === version,
  fn: () => INCOME_HISTORY_NEXT_PAGE_ERROR,
  target: $nextPageError,
});

const sessionEnded = [userModel.logoutUser, userModel.tutorSessionCleared];

// The next tutor must not see this history; the version bump drops responses still in flight.
sample({
  clock: sessionEnded,
  fn: () => null,
  target: [$incomeHistory, $historyRange, $incomeHistoryError, $nextPageError, $nextPageVersion],
});
sample({
  clock: sessionEnded,
  source: $historyVersion,
  fn: (version) => version + 1,
  target: $historyVersion,
});
