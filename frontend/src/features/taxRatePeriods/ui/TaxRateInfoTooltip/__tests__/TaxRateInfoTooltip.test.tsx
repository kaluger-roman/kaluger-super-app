import { ThemeProvider } from "@mui/material";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: /подробности расчёта налога/i })).toBeInTheDocument();
  });

  it("shows breakdown items on hover", async () => {
    const user = userEvent.setup();
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} />);

    await user.hover(screen.getByRole("button", { name: /подробности расчёта налога/i }));

    expect(await screen.findByText(/0%.*вне настроенных периодов/)).toBeInTheDocument();
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

  const trigger = () => screen.getByRole("button", { name: /подробности расчёта налога/i });
  const EXEMPT_LINE = /^Не облагается налогом: 2\s000\s₽$/;

  it("shows the tax-exempt line last when taxExemptIncome is positive", async () => {
    const user = userEvent.setup();
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} taxExemptIncome={2000} />);

    await user.hover(trigger());

    const exemptLine = await screen.findByText(EXEMPT_LINE);
    const lines = screen.getAllByText(/%.*=.*₽|Не облагается налогом/);
    expect(lines[lines.length - 1]).toBe(exemptLine);
    expect(lines).toHaveLength(breakdown.length + 1);
  });

  it.each([0, undefined])(
    "shows only the rate lines when taxExemptIncome is %s",
    async (taxExemptIncome) => {
      const user = userEvent.setup();
      renderWithTheme(
        <TaxRateInfoTooltip breakdown={breakdown} taxExemptIncome={taxExemptIncome} />
      );

      await user.hover(trigger());

      expect(await screen.findByText(/6%.*=.*₽/)).toBeInTheDocument();
      expect(screen.queryByText(/Не облагается налогом/)).toBeNull();
    }
  );

  it("opens on keyboard focus and closes on blur", async () => {
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} taxExemptIncome={2000} />);

    const button = trigger();
    fireEvent.focus(button);
    expect(await screen.findByText(EXEMPT_LINE)).toBeInTheDocument();

    fireEvent.blur(button);
    await waitFor(() => expect(screen.queryByText(EXEMPT_LINE)).toBeNull());
  });

  it("opens on tap and ignores the emulated touch leave", async () => {
    renderWithTheme(<TaxRateInfoTooltip breakdown={breakdown} taxExemptIncome={2000} />);

    const button = trigger();
    fireEvent.pointerEnter(button, { pointerType: "touch" });
    fireEvent.click(button);
    fireEvent.pointerLeave(button, { pointerType: "touch" });

    expect(await screen.findByText(EXEMPT_LINE)).toBeInTheDocument();
  });
});
