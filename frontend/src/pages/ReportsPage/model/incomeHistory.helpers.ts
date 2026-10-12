import type { AxiosError } from "axios";

import type { IncomeHistory } from "@shared";

import type {
  IncomeHistoryRequest,
  LoadNextPageParams,
  NextPageSource,
  ReadyNextPageSource,
  ReadyReloadSource,
  ReloadSource,
} from "./incomeHistory.types";
import type { ReportsPeriod } from "./statistics.types";

// Already loaded day objects are kept by reference so memoized days skip re-render.
export const appendIncomeHistoryPage = (
  history: IncomeHistory | null,
  page: IncomeHistory
): IncomeHistory =>
  history
    ? { summary: history.summary, days: [...history.days, ...page.days], page: page.page }
    : page;

export const getLastLoadedDayKey = (history: IncomeHistory | null): string | null =>
  history && history.days.length > 0 ? history.days[history.days.length - 1].date : null;

export const isNextPageReady = (source: NextPageSource): source is ReadyNextPageSource =>
  !source.isNextPageLoading &&
  !source.isFirstPageLoading &&
  source.range !== null &&
  Boolean(source.history?.page.nextCursor);

export const buildNextPageParams = ({
  history,
  range,
  version,
}: ReadyNextPageSource): LoadNextPageParams => ({
  startDate: range.startDate,
  endDate: range.endDate,
  before: history.page.nextCursor,
  version,
});

export const isReloadReady = (source: ReloadSource): source is ReadyReloadSource =>
  source.range !== null;

const isSamePeriod = (a: ReportsPeriod | null, b: ReportsPeriod): boolean =>
  a !== null && a.startDate === b.startDate && a.endDate === b.endDate;

// The loaded days set the reload depth only while they belong to the applied period.
export const buildReloadRequest = ({
  history,
  historyRange,
  range,
}: ReadyReloadSource): IncomeHistoryRequest => {
  const through = isSamePeriod(historyRange, range) ? getLastLoadedDayKey(history) : null;
  return through ? { ...range, through } : range;
};

export const isNotFoundError = (error: unknown): boolean =>
  (error as AxiosError | undefined)?.response?.status === 404;
