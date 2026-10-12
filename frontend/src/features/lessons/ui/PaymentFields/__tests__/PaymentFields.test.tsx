import { ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { PaymentFields } from "../PaymentFields";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const setupFields = (overrides: Partial<React.ComponentProps<typeof PaymentFields>> = {}) => {
  const props = {
    paymentDate: "2026-02-15",
    receivedAmount: "2000",
    receivedAmountError: null,
    onPaymentDateChange: vi.fn(),
    onReceivedAmountChange: vi.fn(),
    ...overrides,
  };
  renderWithTheme(<PaymentFields {...props} />);
  return props;
};

describe("PaymentFields", () => {
  it("should show the payment date and the received amount", () => {
    setupFields();

    expect(screen.getByLabelText("Дата оплаты")).toHaveValue("2026-02-15");
    expect(screen.getByLabelText("Получено (₽)")).toHaveValue(2000);
    expect(screen.getByText("Сколько реально пришло за урок")).toBeInTheDocument();
  });

  it("should report a changed payment date", () => {
    const props = setupFields();

    fireEvent.change(screen.getByLabelText("Дата оплаты"), { target: { value: "2026-02-20" } });

    expect(props.onPaymentDateChange).toHaveBeenCalledWith("2026-02-20");
  });

  it("should report a changed received amount", () => {
    const props = setupFields();

    fireEvent.change(screen.getByLabelText("Получено (₽)"), { target: { value: "1800" } });

    expect(props.onReceivedAmountChange).toHaveBeenCalledWith("1800");
  });

  it("should show the amount error", () => {
    setupFields({ receivedAmount: "", receivedAmountError: "Укажите полученную сумму" });

    expect(screen.getByText("Укажите полученную сумму")).toBeInTheDocument();
  });
});
