import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Statistics } from "@shared";

import { DebtCard } from "../DebtCard";

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

describe("DebtCard", () => {
  it("should render debt totals and overdue row", () => {
    render(<DebtCard statistics={statistics} />);

    expect(screen.getByText("Задолженность")).toBeInTheDocument();
    expect(screen.getByText("Итого (проведено, не оплачено):")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/1 уроков/)).toBeInTheDocument();
  });

  it("should fall back to zero when debt fields are missing", () => {
    render(
      <DebtCard
        statistics={{
          ...statistics,
          unpaidDebtSum: undefined,
          unpaidDebtCount: undefined,
          unpaidDebtOver24hSum: undefined,
          unpaidDebtOver24hCount: undefined,
        }}
      />
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText(/0 уроков/)).toBeInTheDocument();
  });
});
