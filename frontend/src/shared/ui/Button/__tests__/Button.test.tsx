/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "../../themeConfig";

import { Button } from "../Button";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("Button", () => {
  it("should render button with text", () => {
    renderWithTheme(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("should render with variant prop", () => {
    renderWithTheme(<Button variant="outlined">Outlined</Button>);

    const button = screen.getByRole("button");
    expect(button.getAttribute("class") || "").toContain("MuiButton-outlined");
  });

  it("should render with color prop", () => {
    renderWithTheme(<Button color="primary">Primary</Button>);

    const button = screen.getByRole("button");
    expect(button.getAttribute("class") || "").toContain("MuiButton-colorPrimary");
  });

  it("should be disabled when disabled prop is true", () => {
    renderWithTheme(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should render with fullWidth prop", () => {
    renderWithTheme(<Button fullWidth>Full Width</Button>);

    const button = screen.getByRole("button");
    expect(button.getAttribute("class") || "").toContain("MuiButton-fullWidth");
  });
});
