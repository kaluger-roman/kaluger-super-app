import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { Statistics } from "@shared";

import { CommissionCards } from "../CommissionCards";

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

const renderCards = (overrides: Partial<Statistics> = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <CommissionCards statistics={{ ...statistics, ...overrides }} />
    </ThemeProvider>
  );

describe("CommissionCards", () => {
  it("should render nothing when the tutor has no commission students", () => {
    const { container } = renderCards({ hasCommissionStudents: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when the flag is missing", () => {
    const { container } = renderCards({ hasCommissionStudents: undefined });

    expect(container).toBeEmptyDOMElement();
  });

  it("should render the written-off sum with a payment-date caption", () => {
    renderCards();

    expect(screen.getByText("Списано в счёт комиссий")).toBeInTheDocument();
    expect(screen.getByText(/4.*500.*₽/)).toBeInTheDocument();
    expect(screen.getByText("За период, по дате оплаты")).toBeInTheDocument();
  });

  it("should render a zero card when nothing was written off in the period", () => {
    renderCards({ commissionWrittenOffSum: 0 });

    expect(screen.getByText("Списано в счёт комиссий")).toBeInTheDocument();
    expect(screen.getByText("0 ₽")).toBeInTheDocument();
  });
});
