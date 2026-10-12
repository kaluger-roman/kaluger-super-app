import { allSettled, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import * as incomeHistoryModel from "../incomeHistory.model";
import * as reportsTabsModel from "../reportsTabs.model";
import * as statisticsModel from "../statistics.model";

const createScope = () => {
  const loadStatistics = vi.fn().mockResolvedValue(null);
  const loadHistory = vi.fn().mockResolvedValue(null);
  const scope = fork({
    handlers: [
      [statisticsModel.loadStatisticsFx, loadStatistics],
      [incomeHistoryModel.loadIncomeHistoryFx, loadHistory],
    ],
  });
  return { scope, loadStatistics, loadHistory };
};

describe("reportsTabs.model", () => {
  it("should open the summary tab by default", () => {
    const { scope } = createScope();

    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("summary");
  });

  it("should switch the tab", async () => {
    const { scope } = createScope();

    await allSettled(reportsTabsModel.tabChanged, { scope, params: "history" });

    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("history");
  });

  it("should keep the tab when the reports page is closed and opened again", async () => {
    const { scope } = createScope();

    await allSettled(reportsTabsModel.tabChanged, { scope, params: "history" });
    await allSettled(statisticsModel.ReportsPageGate.close, { scope, params: {} });
    await allSettled(statisticsModel.ReportsPageGate.open, { scope, params: {} });

    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("history");
  });

  it("should not load anything when the tab changes", async () => {
    const { scope, loadStatistics, loadHistory } = createScope();

    await allSettled(reportsTabsModel.tabChanged, { scope, params: "history" });
    await allSettled(reportsTabsModel.tabChanged, { scope, params: "summary" });

    expect(loadStatistics).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
  });
});
