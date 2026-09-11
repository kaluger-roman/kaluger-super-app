import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { RecurringCheckbox } from "../RecurringCheckbox";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("RecurringCheckbox", () => {
  it("should render labeled checkbox reflecting checked state", () => {
    renderWithTheme(<RecurringCheckbox checked={true} disabled={false} onChange={vi.fn()} />);

    expect(
      screen.getByRole("checkbox", { name: "Регулярное занятие (еженедельно)" })
    ).toBeChecked();
  });

  it("should call onChange with the new checked value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<RecurringCheckbox checked={false} disabled={false} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("should be disabled when disabled prop is set", () => {
    renderWithTheme(<RecurringCheckbox checked={false} disabled={true} onChange={vi.fn()} />);

    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
