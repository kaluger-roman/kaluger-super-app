import type { IncomeHistory } from "@shared";

import type { ReportsPeriod } from "./statistics.types";

export type IncomeHistoryRequest = ReportsPeriod & { through?: string };

export type LoadIncomeHistoryParams = IncomeHistoryRequest & { version: number };

export type LoadNextPageParams = ReportsPeriod & { before: string; version: number };

export type NextPageSource = {
  history: IncomeHistory | null;
  range: ReportsPeriod | null;
  version: number;
  isNextPageLoading: boolean;
  isFirstPageLoading: boolean;
};

export type ReadyNextPageSource = NextPageSource & {
  history: IncomeHistory & { page: { nextCursor: string } };
  range: ReportsPeriod;
};

export type ReloadSource = {
  history: IncomeHistory | null;
  historyRange: ReportsPeriod | null;
  range: ReportsPeriod | null;
};

export type ReadyReloadSource = ReloadSource & { range: ReportsPeriod };
