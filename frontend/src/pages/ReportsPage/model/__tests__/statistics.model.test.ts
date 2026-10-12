import { allSettled, createWatch, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import { toLocalEndOfDay, toLocalStartOfDay } from "@features";

import * as incomeHistoryModel from "../incomeHistory.model";
import * as statisticsModel from "../statistics.model";

const START = new Date(2026, 8, 1, 15, 30);
const END = new Date(2026, 8, 30, 9, 0);
const PERIOD = { startDate: toLocalStartOfDay(START), endDate: toLocalEndOfDay(END) };

const createScope = () => {
  const loadStatistics = vi.fn().mockResolvedValue(null);
  const scope = fork({
    values: [
      [statisticsModel.$startDate, START],
      [statisticsModel.$endDate, END],
    ],
    handlers: [
      [statisticsModel.loadStatisticsFx, loadStatistics],
      [incomeHistoryModel.loadIncomeHistoryFx, vi.fn().mockResolvedValue(null)],
    ],
  });
  const periodApplied = vi.fn();
  createWatch({ unit: statisticsModel.periodApplied, fn: periodApplied, scope });
  return { scope, loadStatistics, periodApplied };
};

describe("statistics.model", () => {
  it("should apply the day-bounded period when the reports page opens", async () => {
    const { scope, loadStatistics, periodApplied } = createScope();

    await allSettled(statisticsModel.ReportsPageGate.open, { scope, params: {} });

    expect(periodApplied).toHaveBeenCalledWith(PERIOD);
    expect(scope.getState(statisticsModel.$appliedRange)).toEqual(PERIOD);
    expect(loadStatistics).toHaveBeenCalledWith(PERIOD);
  });

  it("should apply the period on «Обновить»", async () => {
    const { scope, loadStatistics, periodApplied } = createScope();

    await allSettled(statisticsModel.statisticsLoadRequested, { scope });

    expect(periodApplied).toHaveBeenCalledWith(PERIOD);
    expect(scope.getState(statisticsModel.$appliedRange)).toEqual(PERIOD);
    expect(loadStatistics).toHaveBeenCalledTimes(1);
  });

  it("should not change the applied period until «Обновить» is pressed", async () => {
    const { scope, loadStatistics } = createScope();
    await allSettled(statisticsModel.ReportsPageGate.open, { scope, params: {} });

    await allSettled(statisticsModel.startDateChanged, { scope, params: new Date(2026, 7, 1) });
    await allSettled(statisticsModel.endDateChanged, { scope, params: new Date(2026, 7, 31) });

    expect(scope.getState(statisticsModel.$appliedRange)).toEqual(PERIOD);
    expect(loadStatistics).toHaveBeenCalledTimes(1);
  });
});
