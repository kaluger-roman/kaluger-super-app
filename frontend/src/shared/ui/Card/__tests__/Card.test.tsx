/* eslint-disable testing-library/no-node-access, testing-library/no-container, import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "../../themeConfig";

import { Card } from "../Card";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("Card", () => {
  it("should render card with content", () => {
    renderWithTheme(
      <Card>
        <div>Card content</div>
      </Card>
    );

    expect(screen.getByText(/card content/i)).toBeInTheDocument();
  });

  it("should render with variant prop", () => {
    renderWithTheme(<Card variant="outlined">Outlined Card</Card>);

    const el = screen.getByText(/outlined card/i);
    const wrapper = el.closest(".MuiCard-root");
    expect(wrapper).toBeTruthy();
  });

  it("should render with elevation prop", () => {
    renderWithTheme(<Card elevation={3}>Elevated Card</Card>);

    const el = screen.getByText(/elevated card/i);
    const wrapper2 = el.closest(".MuiPaper-elevation3");
    expect(wrapper2).toBeTruthy();
  });

  it("should apply custom className", () => {
    renderWithTheme(<Card className="custom-class">Custom Card</Card>);

    const el = screen.getByText(/custom card/i);
    const wrapper3 = el.closest(".custom-class");
    expect(wrapper3).toBeTruthy();
  });
});
