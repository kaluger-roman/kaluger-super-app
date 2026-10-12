import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import type { IncomeHistory, Statistics } from "@shared";
import { theme } from "@shared";

import { incomeHistoryModel, reportsTabsModel, statisticsModel } from "../model";
import { ReportsPage } from "../ReportsPage";

const LOAD_ERROR =
  "Не удалось загрузить историю поступлений. Нажмите «Обновить», чтобы попробовать ещё раз";

const statistics: Statistics = {
  completedLessons: 10,
  cancelledLessons: 1,
  upcomingLessons: 3,
  totalLessons: 14,
  earnings: 50000,
  lastMonthEarnings: 40000,
  lostEarnings: 2000,
  upcomingIncome: 10000,
  prepaidIncome: 5000,
  unpaidDebtSum: 3000,
  unpaidDebtCount: 2,
  unpaidDebtOver24hSum: 1000,
  unpaidDebtOver24hCount: 1,
  paymentsInRangeSum: 0,
  paymentsInRangeCount: 0,
  trialLessonsCount: 1,
  taxAmount: null,
  taxExemptIncome: null,
  taxBreakdown: null,
};

const emptyHistory: IncomeHistory = {
  summary: { total: 0, count: 0, taxTotal: null, taxExemptTotal: null, commissionTotal: null },
  days: [],
  page: { nextCursor: null, remainingCount: 0 },
};

const createScope = (loadHistory: () => Promise<IncomeHistory> = async () => emptyHistory) =>
  fork({
    values: [[statisticsModel.$statistics, statistics]],
    handlers: [
      [statisticsModel.loadStatisticsFx, async () => statistics],
      [incomeHistoryModel.loadIncomeHistoryFx, loadHistory],
    ],
  });

const renderPage = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <ReportsPage />
        </ThemeProvider>
      </MemoryRouter>
    </EffectorProvider>
  );

describe("ReportsPage", () => {
  it("should open the summary without the history by default", async () => {
    renderPage(createScope());

    expect(await screen.findByText("Заработок")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "История поступлений" })).toBeNull();
    expect(screen.getByText("📅 Период отчета")).toBeInTheDocument();
  });

  it("should show the history instead of the summary on the history tab", async () => {
    const scope = createScope();
    renderPage(scope);

    await userEvent.click(await screen.findByRole("tab", { name: "История поступлений" }));

    expect(await screen.findByRole("region", { name: "История поступлений" })).toBeInTheDocument();
    expect(screen.queryByText("Заработок")).toBeNull();
    expect(screen.getByText("📅 Период отчета")).toBeInTheDocument();
    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("history");
  });

  it("should render the active tab content as a panel labelled by its tab", async () => {
    renderPage(createScope());

    await userEvent.click(await screen.findByRole("tab", { name: "История поступлений" }));

    const tab = screen.getByRole("tab", { name: "История поступлений" });
    const panel = screen.getByRole("tabpanel", { name: "История поступлений" });
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toContainElement(
      await screen.findByRole("region", { name: "История поступлений" })
    );
  });

  it("should load the history together with the statistics on any tab", async () => {
    const loadHistory = vi.fn(async () => emptyHistory);
    renderPage(createScope(loadHistory));

    await screen.findByText("Заработок");

    expect(loadHistory).toHaveBeenCalledTimes(1);
  });

  it("should keep the summary cards when the history fails", async () => {
    const scope = createScope(() => Promise.reject(new Error("network")));
    renderPage(scope);

    expect(await screen.findByText("Заработок")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "История поступлений" }));

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
  });
});
