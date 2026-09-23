import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { Statistics } from "@shared";

import { PeriodIndependentStats } from "../PeriodIndependentStats";

const statistics: Statistics = {
  completedLessons: 10,
  cancelledLessons: 1,
  upcomingLessons: 3,
  totalLessons: 14,
  earnings: 50000,
  lastMonthEarnings: 40000,
  lostEarnings: 2000,
  prepaidIncome: 5000,
  hasCommissionStudents: true,
  commissionWrittenOffSum: 4500,
  commissionRemainingTotal: 2500,
  taxAmount: null,
  taxBreakdown: null,
};

const renderStats = (overrides: Partial<Statistics> = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <PeriodIndependentStats statistics={{ ...statistics, ...overrides }} />
    </ThemeProvider>
  );

describe("PeriodIndependentStats", () => {
  it("should always render the group caption, even without commissions", () => {
    renderStats({ hasCommissionStudents: false });

    expect(screen.getByText("Не зависит от выбранного периода")).toBeInTheDocument();
  });

  it("should keep the prepaid card inside the group with its own value", () => {
    renderStats({ hasCommissionStudents: false });

    expect(screen.getByText("Предоплата")).toBeInTheDocument();
    expect(screen.getByText(/5.*000.*₽/)).toBeInTheDocument();
    expect(screen.getByText("Доход от предоплаченных уроков (остаток)")).toBeInTheDocument();
  });

  it("should fall back to zero when prepaid income is missing", () => {
    renderStats({ hasCommissionStudents: false, prepaidIncome: undefined });

    expect(screen.getByText("0 ₽")).toBeInTheDocument();
  });

  it("should hide the remaining-commission card without commission students", () => {
    renderStats({ hasCommissionStudents: false });

    expect(screen.queryByText("Осталось погасить комиссий")).toBeNull();
  });

  it("should show the remaining-commission card for commission students", () => {
    renderStats();

    expect(screen.getByText("Осталось погасить комиссий")).toBeInTheDocument();
    expect(screen.getByText(/2.*500.*₽/)).toBeInTheDocument();
  });

  it("should caption the remaining commission as a snapshot, not a period figure", () => {
    renderStats();

    expect(
      screen.getByText("Суммарный остаток по активным ученикам на текущий момент")
    ).toBeInTheDocument();
  });
});
