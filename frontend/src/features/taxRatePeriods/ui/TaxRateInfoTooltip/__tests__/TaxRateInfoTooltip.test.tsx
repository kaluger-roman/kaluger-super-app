import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import type { TaxBreakdownEntry } from "@shared";
import { theme } from "@shared";

import { TaxRateInfoTooltip } from "../TaxRateInfoTooltip";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("TaxRateInfoTooltip", () => {
  const breakdown: TaxBreakdownEntry[] = [
    { rate: 0, earnings: 5000, tax: 0, isOutsidePeriods: true },
    { rate: 4, earnings: 30000, tax: 1200 },
    { rate: 6, earnings: 50000, tax: 3000 },
  ];

  it("renders an info button", () => {
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} />);
    expect(
      screen.getByRole("button", { name: /подробности расчёта налога/i }),
    ).toBeInTheDocument();
  });

  it("shows breakdown items on hover", async () => {
    const user = userEvent.setup();
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} />);

    await user.hover(
      screen.getByRole("button", { name: /подробности расчёта налога/i }),
    );

    expect(
      await screen.findByText(/0%.*вне настроенных периодов/),
    ).toBeInTheDocument();
    expect(screen.getByText(/4%.*=.*₽/)).toBeInTheDocument();
    expect(screen.getByText(/6%.*=.*₽/)).toBeInTheDocument();
  });

  it("shows breakdown on click", async () => {
    const user = userEvent.setup();
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} />);

    const trigger = screen.getByRole("button", {
      name: /подробности расчёта налога/i,
    });
    await user.click(trigger);
    expect(await screen.findByText(/4%.*=.*₽/)).toBeInTheDocument();
  });
});
