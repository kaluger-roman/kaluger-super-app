import { allSettled, fork } from "effector";
import { afterEach, describe, it, expect, vi } from "vitest";

import { userModel } from "@entities";
import type { IncomeHistory, Statistics } from "@shared";

import { PERIOD, createDeferred, flush, makeHistory } from "./incomeHistory.fixtures";
import * as incomeHistoryModel from "../incomeHistory.model";
import * as reportsTabsModel from "../reportsTabs.model";
import * as statisticsModel from "../statistics.model";

const PREVIOUS_HISTORY = makeHistory(["2026-09-25"], {
  nextCursor: "2026-09-25",
  remainingCount: 4,
});

const createScope = (loadHistory = vi.fn().mockResolvedValue(PREVIOUS_HISTORY)) =>
  fork({
    values: [
      [incomeHistoryModel.$incomeHistory, PREVIOUS_HISTORY],
      [incomeHistoryModel.$historyRange, PERIOD],
      [incomeHistoryModel.$incomeHistoryError, "ошибка"],
      [incomeHistoryModel.$nextPageError, "ошибка"],
      [incomeHistoryModel.$historyVersion, 3],
      [reportsTabsModel.$activeTab, "history"],
      [statisticsModel.$statistics, { earnings: 1500 } as Statistics],
      [statisticsModel.$appliedRange, PERIOD],
      [statisticsModel.$error, "ошибка"],
    ],
    handlers: [
      [statisticsModel.loadStatisticsFx, vi.fn().mockResolvedValue(null)],
      [incomeHistoryModel.loadIncomeHistoryFx, loadHistory],
    ],
  });

describe("reports page stores on the end of a tutor session", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["logoutUser", userModel.logoutUser],
    ["tutorSessionCleared", userModel.tutorSessionCleared],
  ])("should drop the previous tutor's reports on %s", async (_name, sessionEnded) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scope = createScope();

    await allSettled(sessionEnded, { scope });

    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toBeNull();
    expect(scope.getState(incomeHistoryModel.$historyRange)).toBeNull();
    expect(scope.getState(incomeHistoryModel.$incomeHistoryError)).toBeNull();
    expect(scope.getState(incomeHistoryModel.$nextPageError)).toBeNull();
    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("summary");
    expect(scope.getState(statisticsModel.$statistics)).toBeNull();
    expect(scope.getState(statisticsModel.$appliedRange)).toBeNull();
    expect(scope.getState(statisticsModel.$error)).toBeNull();
  });

  it("should not apply a history response that arrives after the session ended", async () => {
    const pending = createDeferred<IncomeHistory>();
    const scope = createScope(vi.fn().mockReturnValueOnce(pending.promise));

    const settled = allSettled(incomeHistoryModel.incomeHistoryRequested, {
      scope,
      params: PERIOD,
    });
    await flush();
    void allSettled(userModel.tutorSessionCleared, { scope });
    await flush();
    pending.resolve(PREVIOUS_HISTORY);
    await settled;

    expect(scope.getState(incomeHistoryModel.$incomeHistory)).toBeNull();
  });
});
