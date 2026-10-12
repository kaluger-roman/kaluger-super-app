import { allSettled, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import type { IncomeHistory } from "@shared";

import { PERIOD, createDeferred, flush, makeHistory } from "./incomeHistory.fixtures";
import {
  INCOME_HISTORY_LOAD_ERROR,
  INCOME_HISTORY_NEXT_PAGE_ERROR,
} from "../incomeHistory.constants";
import * as incomeHistoryModel from "../incomeHistory.model";
import * as reportsTabsModel from "../reportsTabs.model";
import * as statisticsModel from "../statistics.model";

const FIRST_PAGE = makeHistory(["2026-09-25", "2026-09-20"], {
  nextCursor: "2026-09-20",
  remainingCount: 3,
});
const SECOND_PAGE = makeHistory(["2026-09-12", "2026-09-03"], {
  nextCursor: null,
  remainingCount: 0,
});

type Handler = (params: unknown) => Promise<IncomeHistory>;

const createScope = ({
  history = null,
  loadHistory = vi.fn<Handler>().mockResolvedValue(FIRST_PAGE),
  loadNextPage = vi.fn<Handler>().mockResolvedValue(SECOND_PAGE),
  version = 0,
}: {
  history?: IncomeHistory | null;
  loadHistory?: ReturnType<typeof vi.fn<Handler>>;
  loadNextPage?: ReturnType<typeof vi.fn<Handler>>;
  version?: number;
} = {}) => {
  const scope = fork({
    values: [
      [incomeHistoryModel.$incomeHistory, history],
      [incomeHistoryModel.$historyVersion, version],
      [statisticsModel.$appliedRange, history ? PERIOD : null],
    ],
    handlers: [
      [statisticsModel.loadStatisticsFx, vi.fn().mockResolvedValue(null)],
      [incomeHistoryModel.loadIncomeHistoryFx, loadHistory],
      [incomeHistoryModel.loadNextPageFx, loadNextPage],
    ],
  });
  return { scope, loadHistory, loadNextPage };
};

describe("incomeHistory.model first page", () => {
  it.each(["summary", "history"] as const)(
    "should load the first page for the applied period on the %s tab",
    async (tab) => {
      const { scope, loadHistory } = createScope();
      await allSettled(reportsTabsModel.tabChanged, { scope, params: tab });

      await allSettled(statisticsModel.periodApplied, { scope, params: PERIOD });

      expect(loadHistory).toHaveBeenCalledTimes(1);
      expect(loadHistory).toHaveBeenCalledWith({ ...PERIOD, version: 1 });
    }
  );

  it("should store the loaded history and clear errors", async () => {
    const { scope } = createScope();
    const errorScope = fork({
      values: [
        [incomeHistoryModel.$incomeHistoryError, "старая ошибка"],
        [incomeHistoryModel.$nextPageError, "старая ошибка"],
      ],
      handlers: [[incomeHistoryModel.loadIncomeHistoryFx, vi.fn().mockResolvedValue(FIRST_PAGE)]],
    });

    await allSettled(incomeHistoryModel.incomeHistoryRequested, { scope, params: PERIOD });
    await allSettled(incomeHistoryModel.incomeHistoryRequested, {
      scope: errorScope,
      params: PERIOD,
    });

    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toEqual(FIRST_PAGE);
    expect(scope.getState(incomeHistoryModel.$historyRange)).toEqual(PERIOD);
    expect(errorScope.getState(incomeHistoryModel.$incomeHistoryError)).toBeNull();
    expect(errorScope.getState(incomeHistoryModel.$nextPageError)).toBeNull();
  });

  it("should pass through to reload the history to the same depth", async () => {
    const { scope, loadHistory } = createScope();

    await allSettled(incomeHistoryModel.incomeHistoryRequested, {
      scope,
      params: { ...PERIOD, through: "2026-09-12" },
    });

    expect(loadHistory).toHaveBeenCalledWith({ ...PERIOD, through: "2026-09-12", version: 1 });
  });

  it("should show a Russian error when the first page fails", async () => {
    const { scope } = createScope({
      loadHistory: vi.fn<Handler>().mockRejectedValue(new Error("network")),
    });

    await allSettled(statisticsModel.periodApplied, { scope, params: PERIOD });

    expect(scope.getState(incomeHistoryModel.$incomeHistoryError)).toBe(INCOME_HISTORY_LOAD_ERROR);
  });

  it("should apply only the response of the latest period", async () => {
    const first = createDeferred<IncomeHistory>();
    const second = createDeferred<IncomeHistory>();
    const latest = makeHistory(["2026-08-10"]);
    const loadHistory = vi
      .fn<Handler>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { scope } = createScope({ loadHistory });

    const settled = Promise.all([
      allSettled(statisticsModel.periodApplied, { scope, params: PERIOD }),
      allSettled(statisticsModel.periodApplied, { scope, params: PERIOD }),
    ]);
    await flush();
    second.resolve(latest);
    await flush();
    first.resolve(FIRST_PAGE);
    await settled;

    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toEqual(latest);
    expect(scope.getState(incomeHistoryModel.$historyVersion)).toBe(2);
  });

  it("should ignore a failure of an outdated first page", async () => {
    const first = createDeferred<IncomeHistory>();
    const loadHistory = vi
      .fn<Handler>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(FIRST_PAGE);
    const { scope } = createScope({ loadHistory });

    const settled = Promise.all([
      allSettled(statisticsModel.periodApplied, { scope, params: PERIOD }),
      allSettled(statisticsModel.periodApplied, { scope, params: PERIOD }),
    ]);
    await flush();
    first.reject(new Error("late"));
    await settled;

    expect(scope.getState(incomeHistoryModel.$incomeHistoryError)).toBeNull();
    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toEqual(FIRST_PAGE);
  });
});

describe("incomeHistory.model next page", () => {
  it("should load the next page before the cursor of the applied period", async () => {
    const { scope, loadNextPage } = createScope({ history: FIRST_PAGE, version: 1 });

    await allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });

    expect(loadNextPage).toHaveBeenCalledWith({ ...PERIOD, before: "2026-09-20", version: 1 });
  });

  it("should append the days, take the new page and keep the summary", async () => {
    const { scope } = createScope({ history: FIRST_PAGE, version: 1 });

    await allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });

    const history = scope.getState(incomeHistoryModel.$incomeHistory);
    expect(history?.days.map((day) => day.date)).toEqual([
      "2026-09-25",
      "2026-09-20",
      "2026-09-12",
      "2026-09-03",
    ]);
    expect(history?.days[0]).toBe(FIRST_PAGE.days[0]);
    expect(history?.page).toEqual(SECOND_PAGE.page);
    expect(history?.summary).toEqual(FIRST_PAGE.summary);
  });

  it("should not start a second request while a page is loading", async () => {
    const pending = createDeferred<IncomeHistory>();
    const loadNextPage = vi.fn<Handler>().mockReturnValue(pending.promise);
    const { scope } = createScope({ history: FIRST_PAGE, version: 1, loadNextPage });

    const settled = allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });
    await flush();
    expect(scope.getState(incomeHistoryModel.$isNextPageLoading)).toBe(true);
    void allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });
    await flush();
    pending.resolve(SECOND_PAGE);
    await settled;

    expect(loadNextPage).toHaveBeenCalledTimes(1);
  });

  it("should not request a page while the first page is loading", async () => {
    const pending = createDeferred<IncomeHistory>();
    const { scope, loadNextPage } = createScope({
      history: FIRST_PAGE,
      version: 1,
      loadHistory: vi.fn<Handler>().mockReturnValue(pending.promise),
    });

    const settled = allSettled(statisticsModel.periodApplied, { scope, params: PERIOD });
    await flush();
    void allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });
    await flush();
    pending.resolve(FIRST_PAGE);
    await settled;

    expect(loadNextPage).not.toHaveBeenCalled();
  });

  it("should do nothing when everything is loaded", async () => {
    const { scope, loadNextPage } = createScope({ history: SECOND_PAGE, version: 1 });

    await allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });

    expect(loadNextPage).not.toHaveBeenCalled();
  });

  it("should keep the shown days on a page error and clear the error on retry", async () => {
    const loadNextPage = vi
      .fn<Handler>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(SECOND_PAGE);
    const { scope } = createScope({ history: FIRST_PAGE, version: 1, loadNextPage });

    await allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });

    expect(scope.getState(incomeHistoryModel.$nextPageError)).toBe(INCOME_HISTORY_NEXT_PAGE_ERROR);
    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toEqual(FIRST_PAGE);

    await allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });

    expect(scope.getState(incomeHistoryModel.$nextPageError)).toBeNull();
    expect(scope.getState(incomeHistoryModel.$incomeHistory)?.days).toHaveLength(4);
  });

  it("should drop a page that arrives after a new period was applied", async () => {
    const pending = createDeferred<IncomeHistory>();
    const freshHistory = makeHistory(["2026-08-10"]);
    const { scope } = createScope({
      history: FIRST_PAGE,
      version: 1,
      loadNextPage: vi.fn<Handler>().mockReturnValue(pending.promise),
      loadHistory: vi.fn<Handler>().mockResolvedValue(freshHistory),
    });

    const settled = allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });
    await flush();
    void allSettled(statisticsModel.periodApplied, { scope, params: PERIOD });
    await flush();
    pending.resolve(SECOND_PAGE);
    await settled;

    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toEqual(freshHistory);
  });

  it("should not show the fresh history as loading while an outdated page is still in flight", async () => {
    const outdated = createDeferred<IncomeHistory>();
    const loadNextPage = vi
      .fn<Handler>()
      .mockReturnValueOnce(outdated.promise)
      .mockResolvedValueOnce(SECOND_PAGE);
    const { scope } = createScope({
      history: FIRST_PAGE,
      version: 1,
      loadNextPage,
      loadHistory: vi.fn<Handler>().mockResolvedValue(FIRST_PAGE),
    });

    const settled = allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });
    await flush();
    void allSettled(statisticsModel.periodApplied, { scope, params: PERIOD });
    await flush();

    expect(scope.getState(incomeHistoryModel.$isNextPageLoading)).toBe(false);

    void allSettled(incomeHistoryModel.incomeHistoryNextPageRequested, { scope });
    await flush();
    expect(loadNextPage).toHaveBeenCalledTimes(2);

    outdated.resolve(SECOND_PAGE);
    await settled;
    expect(scope.getState(incomeHistoryModel.$isNextPageLoading)).toBe(false);
  });
});
