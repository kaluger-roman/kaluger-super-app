import { ThemeProvider } from "@mui/material";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { ContactMethodSelect } from "../ContactMethodSelect";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("ContactMethodSelect", () => {
  it("should render the given label and selected value", () => {
    renderWithTheme(
      <ContactMethodSelect
        id="contact-method"
        label="Способ связи"
        value="TELEGRAM"
        isMobile={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Способ связи")).toHaveTextContent("Telegram");
  });

  it("should fall back to WhatsApp when value is undefined", () => {
    renderWithTheme(
      <ContactMethodSelect
        id="contact-method"
        label="Способ связи"
        isMobile={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Способ связи")).toHaveTextContent("WhatsApp");
  });

  it("should call onChange with the picked method", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <ContactMethodSelect
        id="contact-method"
        label="Способ связи"
        value="WHATSAPP"
        isMobile={false}
        onChange={onChange}
      />
    );

    await user.click(screen.getByLabelText("Способ связи"));
    await user.click(within(screen.getByRole("listbox")).getByText("MAX"));

    expect(onChange).toHaveBeenCalledWith("MAX");
  });
});
