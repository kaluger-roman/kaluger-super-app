import { ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { ReceivedAmountField } from "../ReceivedAmountField";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("ReceivedAmountField", () => {
  it("should render the labelled amount field with the rouble sign", () => {
    renderWithTheme(<ReceivedAmountField value="2000" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Получено (₽)")).toHaveValue(2000);
    expect(screen.getByText("₽")).toBeInTheDocument();
  });

  it("should show the helper text when there is no error", () => {
    renderWithTheme(
      <ReceivedAmountField value="2000" helperText="Сколько реально пришло" onChange={vi.fn()} />
    );

    expect(screen.getByText("Сколько реально пришло")).toBeInTheDocument();
  });

  it("should show the error instead of the helper text", () => {
    renderWithTheme(
      <ReceivedAmountField
        value=""
        error="Укажите полученную сумму"
        helperText="Сколько реально пришло"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Укажите полученную сумму")).toBeInTheDocument();
    expect(screen.queryByText("Сколько реально пришло")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Получено (₽)")).toHaveAttribute("aria-invalid", "true");
  });

  it("should report the typed value as a string", () => {
    const onChange = vi.fn();
    renderWithTheme(<ReceivedAmountField value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Получено (₽)"), { target: { value: "1800.5" } });

    expect(onChange).toHaveBeenCalledWith("1800.5");
  });

  it("should be disabled when requested", () => {
    renderWithTheme(<ReceivedAmountField value="2000" disabled onChange={vi.fn()} />);

    expect(screen.getByLabelText("Получено (₽)")).toBeDisabled();
  });
});
