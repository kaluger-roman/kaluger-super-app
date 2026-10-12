import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "@shared";
import type { IncomeHistoryTax as IncomeHistoryTaxData } from "@shared";

import { IncomeHistoryTax } from "../IncomeHistoryTax";

const renderTax = (tax: IncomeHistoryTaxData | null) =>
  render(
    <ThemeProvider theme={theme}>
      <IncomeHistoryTax tax={tax} />
    </ThemeProvider>
  );

describe("IncomeHistoryTax", () => {
  it("should render nothing without tax data", () => {
    const { container } = renderTax(null);

    expect(container).toBeEmptyDOMElement();
  });

  it("should show the tax and the rate of a taxed payment", () => {
    renderTax({ kind: "TAXED", amount: 60, rate: 6 });

    expect(screen.getByText(/^налог 60\s₽ · 6%$/)).toBeInTheDocument();
  });

  it("should show a zero rate as taxed", () => {
    renderTax({ kind: "TAXED", amount: 0, rate: 0 });

    expect(screen.getByText(/^налог 0\s₽ · 0%$/)).toBeInTheDocument();
  });

  it("should mark a payment outside the configured periods", () => {
    renderTax({ kind: "OUTSIDE_PERIODS" });

    expect(screen.getByText(/^налог 0\s₽ · вне настроенных периодов$/)).toBeInTheDocument();
  });

  it("should mark a tax-exempt payment", () => {
    renderTax({ kind: "EXEMPT" });

    expect(
      screen.getByRole("img", {
        name: "Не облагается налогом: доход по уроку не учитывается в сумме налога",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/^налог/)).toBeNull();
  });
});
