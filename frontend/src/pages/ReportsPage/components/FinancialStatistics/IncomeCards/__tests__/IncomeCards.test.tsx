import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { afterEach, describe, it, expect, vi } from "vitest";

import type { Statistics } from "@shared";
import { theme } from "@shared";

import { reportsTabsModel } from "../../../../model";
import { IncomeCards } from "../IncomeCards";

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
  paymentsInRangeSum: 25000,
  paymentsInRangeCount: 4,
  trialLessonsCount: 1,
  taxAmount: null,
  taxExemptIncome: null,
  taxBreakdown: null,
};

const renderCards = (cardStatistics: Statistics, scope = fork()) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <IncomeCards statistics={cardStatistics} />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("IncomeCards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render earnings and payments cards", () => {
    renderCards(statistics);

    expect(screen.getByText("Заработок")).toBeInTheDocument();
    expect(screen.getByText("Поступления за период")).toBeInTheDocument();
    expect(screen.getByText(/4 оплаты по дате платежа/)).toBeInTheDocument();
  });

  it("should mark the earnings amount with the test id used by e2e", () => {
    renderCards(statistics);

    expect(screen.getByTestId("earnings")).toHaveTextContent(/50\s*000/);
  });

  it("should not render the period-independent prepaid card", () => {
    renderCards(statistics);

    expect(screen.queryByText("Предоплата")).toBeNull();
  });

  it("should fall back to zero for missing payments sums", () => {
    renderCards({
      ...statistics,
      paymentsInRangeSum: undefined,
      paymentsInRangeCount: undefined,
    });

    expect(screen.getByText(/0 оплат по дате платежа/)).toBeInTheDocument();
  });

  it("should open the history tab and scroll to the tabs from the history link", async () => {
    const scrollIntoView = vi.fn();
    const tabs = document.createElement("div");
    tabs.id = "reports-tabs";
    tabs.scrollIntoView = scrollIntoView;
    document.body.appendChild(tabs);
    const scope = fork();

    renderCards(statistics, scope);
    await userEvent.click(screen.getByRole("button", { name: /История поступлений по дням/ }));

    expect(scope.getState(reportsTabsModel.$activeTab)).toBe("history");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    tabs.remove();
  });

  it("should show payments with kopecks like the income history total", () => {
    renderCards({ ...statistics, paymentsInRangeSum: 1500.5 });

    expect(screen.getByTestId("payments-in-range").textContent?.replace(/\s/g, " ")).toBe(
      "1 500,50 ₽"
    );
  });
});
