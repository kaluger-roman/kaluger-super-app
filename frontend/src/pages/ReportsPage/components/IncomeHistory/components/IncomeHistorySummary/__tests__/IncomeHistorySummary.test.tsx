import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { IncomeHistorySummary as IncomeHistorySummaryData } from "@shared";

import { money } from "../../../__tests__/incomeHistory.fixtures";
import { IncomeHistorySummary } from "../IncomeHistorySummary";

const baseSummary: IncomeHistorySummaryData = {
  total: 17700.5,
  count: 10,
  taxTotal: null,
  taxExemptTotal: null,
  commissionTotal: null,
};

const renderSummary = (summary: IncomeHistorySummaryData) =>
  render(
    <ThemeProvider theme={theme}>
      <IncomeHistorySummary summary={summary} />
    </ThemeProvider>
  );

describe("IncomeHistorySummary", () => {
  it("should always show the period total and the number of payments", () => {
    renderSummary(baseSummary);

    expect(screen.getByText("Поступило за период")).toBeInTheDocument();
    expect(screen.getByTestId("income-history-total")).toHaveTextContent(money(17700.5, true));
    expect(screen.getByText("10 оплат")).toBeInTheDocument();
    expect(screen.queryByText("Налог")).toBeNull();
    expect(screen.queryByText("Не облагается налогом")).toBeNull();
    expect(screen.queryByText("В счёт комиссий")).toBeNull();
  });

  it("should show the tax, the exempt and the commission tiles when the server sends them", () => {
    renderSummary({ ...baseSummary, taxTotal: 954, taxExemptTotal: 1800, commissionTotal: 3000 });

    expect(screen.getByText("Налог")).toBeInTheDocument();
    expect(screen.getByText(money(954))).toBeInTheDocument();
    expect(screen.getByText("Не облагается налогом")).toBeInTheDocument();
    expect(screen.getByText("В счёт комиссий")).toBeInTheDocument();
  });

  it("should hide the exempt tile when nothing was exempt", () => {
    renderSummary({ ...baseSummary, taxTotal: 0, taxExemptTotal: 0 });

    expect(screen.getByText("Налог")).toBeInTheDocument();
    expect(screen.queryByText("Не облагается налогом")).toBeNull();
  });
});
