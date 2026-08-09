import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { theme } from "../../../ui";
import { InfoTooltip } from "../InfoTooltip";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("InfoTooltip", () => {
  it("should render an accessible info button with the given aria-label", () => {
    renderWithTheme(<InfoTooltip title="Пояснение" ariaLabel="Что это значит" />);

    expect(
      screen.getByRole("button", { name: "Что это значит" })
    ).toBeInTheDocument();
  });

  it("should show the tooltip text on hover", async () => {
    const user = userEvent.setup();
    renderWithTheme(<InfoTooltip title="Пояснение к полю" ariaLabel="Инфо" />);

    await user.hover(screen.getByRole("button", { name: "Инфо" }));

    expect(await screen.findByText("Пояснение к полю")).toBeInTheDocument();
  });

  it("should toggle the tooltip text on click", async () => {
    const user = userEvent.setup();
    renderWithTheme(<InfoTooltip title="Текст подсказки" ariaLabel="Инфо" />);

    await user.click(screen.getByRole("button", { name: "Инфо" }));

    expect(await screen.findByText("Текст подсказки")).toBeInTheDocument();
  });
});
