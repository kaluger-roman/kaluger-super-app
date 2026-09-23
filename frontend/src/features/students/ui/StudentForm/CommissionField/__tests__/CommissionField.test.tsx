import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { COMMISSION_ERROR_TEXTS, COMMISSION_HELPER_TEXT } from "../../../../models";
import { CommissionField } from "../CommissionField";

const renderField = (value: string, onChange = vi.fn()) =>
  render(
    <ThemeProvider theme={theme}>
      <CommissionField value={value} isMobile={false} onChange={onChange} />
    </ThemeProvider>
  );

describe("CommissionField", () => {
  it("should render the helper text by default", () => {
    renderField("");

    expect(screen.getByText(COMMISSION_HELPER_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(COMMISSION_ERROR_TEXTS.negative)).toBeNull();
  });

  it("should show the error text for a negative value", () => {
    renderField("-100");

    expect(screen.getByText(COMMISSION_ERROR_TEXTS.negative)).toBeInTheDocument();
  });

  it("should not show an error for zero", () => {
    renderField("0");

    expect(screen.queryByText(COMMISSION_ERROR_TEXTS.negative)).toBeNull();
    expect(screen.getByText(COMMISSION_HELPER_TEXT)).toBeInTheDocument();
  });

  it("should render the current value", () => {
    renderField("3000");

    expect(screen.getByLabelText("Комиссия")).toHaveValue(3000);
  });

  it("should call onChange when the user types", async () => {
    const onChange = vi.fn();
    renderField("", onChange);

    await userEvent.type(screen.getByLabelText("Комиссия"), "5");

    expect(onChange).toHaveBeenCalled();
  });
});
