import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Statistics } from "@shared";

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
  taxBreakdown: null,
};

describe("IncomeCards", () => {
  it("should render earnings, prepaid and payments cards", () => {
    render(<IncomeCards statistics={statistics} />);

    expect(screen.getByText("Заработок")).toBeInTheDocument();
    expect(screen.getByText("Предоплата")).toBeInTheDocument();
    expect(screen.getByText("Поступления за период")).toBeInTheDocument();
    expect(screen.getByText(/4 оплат по дате платежа/)).toBeInTheDocument();
  });

  it("should fall back to zero for missing prepaid and payments sums", () => {
    render(
      <IncomeCards
        statistics={{
          ...statistics,
          prepaidIncome: undefined,
          paymentsInRangeSum: undefined,
          paymentsInRangeCount: undefined,
        }}
      />
    );

    expect(screen.getByText(/0 оплат по дате платежа/)).toBeInTheDocument();
  });
});
