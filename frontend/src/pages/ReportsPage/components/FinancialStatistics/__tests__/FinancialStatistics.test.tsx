import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Statistics } from "@shared";

import { FinancialStatistics } from "../FinancialStatistics";

const createStatistics = (
  overrides: Partial<Statistics> = {},
): Statistics => ({
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
  taxAmount: 3000,
  taxBreakdown: [{ rate: 6, earnings: 50000, tax: 3000 }],
  ...overrides,
});

describe("FinancialStatistics", () => {
  it("renders tax card with single rate label", () => {
    render(<FinancialStatistics statistics={createStatistics()} />);
    expect(screen.getByText("Налоги (6%)")).toBeInTheDocument();
    expect(
      screen.getByText("Сумма налога по оплатам за период"),
    ).toBeInTheDocument();
  });

  it("renders neutral tax label and info button when multiple rates apply", () => {
    render(
      <FinancialStatistics
        statistics={createStatistics({
          taxAmount: 1200,
          taxBreakdown: [
            { rate: 4, earnings: 15000, tax: 600 },
            { rate: 6, earnings: 10000, tax: 600 },
          ],
        })}
      />,
    );

    expect(screen.getByText("Налоги")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /подробности расчёта налога/i }),
    ).toBeInTheDocument();
  });

  it("hides tax card entirely when taxAmount is null", () => {
    render(
      <FinancialStatistics
        statistics={createStatistics({
          taxAmount: null,
          taxBreakdown: null,
        })}
      />,
    );
    expect(screen.queryByText(/налоги/i)).toBeNull();
  });

  it("renders other financial cards regardless of tax state", () => {
    render(<FinancialStatistics statistics={createStatistics()} />);
    expect(screen.getByText("Заработок")).toBeInTheDocument();
    expect(screen.getByText("Предоплата")).toBeInTheDocument();
    expect(screen.getByText("Поступления за период")).toBeInTheDocument();
    expect(screen.getByText("Средний урок")).toBeInTheDocument();
    expect(screen.getByText("Потери от отмен")).toBeInTheDocument();
    expect(screen.getByText("Потенциальный доход за период")).toBeInTheDocument();
    expect(screen.getByText("Задолженность")).toBeInTheDocument();
    expect(screen.getByText("Пробные уроки")).toBeInTheDocument();
  });
});
