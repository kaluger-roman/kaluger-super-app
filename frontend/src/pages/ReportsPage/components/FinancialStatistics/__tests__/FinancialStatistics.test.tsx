import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Statistics } from "@shared";

import { FinancialStatistics } from "../FinancialStatistics";

const createStatistics = (overrides: Partial<Statistics> = {}): Statistics => ({
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
  ...overrides,
});

describe("FinancialStatistics", () => {
  it("should render tax card with tax rate in title", () => {
    render(<FinancialStatistics statistics={createStatistics()} taxRate={6} />);

    expect(screen.getByText("Налоги (6%)")).toBeInTheDocument();
    expect(screen.getByText("Сумма налога от заработка за период")).toBeInTheDocument();
  });

  it("should display custom tax rate in title", () => {
    render(
      <FinancialStatistics statistics={createStatistics()} taxRate={13} />,
    );

    expect(screen.getByText("Налоги (13%)")).toBeInTheDocument();
  });

  it("should render all financial cards including tax", () => {
    render(<FinancialStatistics statistics={createStatistics()} taxRate={6} />);

    expect(screen.getByText("Заработок")).toBeInTheDocument();
    expect(screen.getByText("Предоплата")).toBeInTheDocument();
    expect(screen.getByText("Поступления за период")).toBeInTheDocument();
    expect(screen.getByText("Средний урок")).toBeInTheDocument();
    expect(screen.getByText("Потери от отмен")).toBeInTheDocument();
    expect(screen.getByText("Налоги (6%)")).toBeInTheDocument();
    expect(screen.getByText("Потенциальный доход за период")).toBeInTheDocument();
    expect(screen.getByText("Задолженность")).toBeInTheDocument();
    expect(screen.getByText("Пробные уроки")).toBeInTheDocument();
  });

  it("should render payments in range card with amount and lesson count", () => {
    render(
      <FinancialStatistics
        statistics={createStatistics({
          paymentsInRangeSum: 25000,
          paymentsInRangeCount: 4,
        })}
        taxRate={6}
      />,
    );

    expect(screen.getByText("Поступления за период")).toBeInTheDocument();
    expect(
      screen.getByText(/Сумма платежей за 4 уроков по дате оплаты в выбранном периоде/),
    ).toBeInTheDocument();
  });

  it("should show zero payments when not provided", () => {
    render(
      <FinancialStatistics
        statistics={createStatistics({
          paymentsInRangeSum: undefined,
          paymentsInRangeCount: undefined,
        })}
        taxRate={6}
      />,
    );

    expect(
      screen.getByText(/Сумма платежей за 0 уроков по дате оплаты в выбранном периоде/),
    ).toBeInTheDocument();
  });
});
