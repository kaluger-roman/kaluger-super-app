import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "../../themeConfig";
import { CommissionBadge } from "../CommissionBadge";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("CommissionBadge", () => {
  it("should render nothing without a credit", () => {
    const { container } = renderWithTheme(<CommissionBadge credit={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing for a zero credit", () => {
    const { container } = renderWithTheme(
      <CommissionBadge credit={{ amount: 0, state: "FACT" }} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should render the credited amount in brackets for a fact", () => {
    renderWithTheme(<CommissionBadge credit={{ amount: 1000, state: "FACT" }} />);

    expect(screen.getByText(/^\(.*1.*000.*₽\)$/)).toBeInTheDocument();
    expect(screen.getByTestId("HandshakeIcon")).toBeInTheDocument();
  });

  it("should mark a forecast with a tilde and an outlined icon", () => {
    renderWithTheme(<CommissionBadge credit={{ amount: 1000, state: "FORECAST" }} />);

    expect(screen.getByText(/^\(~/)).toBeInTheDocument();
    expect(screen.getByTestId("HandshakeOutlinedIcon")).toBeInTheDocument();
  });

  it("should distinguish fact and forecast beyond colour", () => {
    const { rerender } = renderWithTheme(
      <CommissionBadge credit={{ amount: 1000, state: "FACT" }} />
    );
    const factText = screen.getByRole("img").textContent;

    rerender(
      <ThemeProvider theme={theme}>
        <CommissionBadge credit={{ amount: 1000, state: "FORECAST" }} />
      </ThemeProvider>
    );

    expect(screen.getByRole("img").textContent).not.toBe(factText);
  });

  it("should describe the state in the aria label", () => {
    renderWithTheme(<CommissionBadge credit={{ amount: 1000, state: "FACT" }} />);

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Зачтено в счёт комиссии");
  });

  it("should describe a forecast differently in the aria label", () => {
    renderWithTheme(<CommissionBadge credit={{ amount: 1000, state: "FORECAST" }} />);

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Предварительно пойдёт в счёт комиссии"
    );
  });

  it("should render an expanded label in the full variant", () => {
    renderWithTheme(<CommissionBadge credit={{ amount: 500, state: "FACT" }} variant="full" />);

    expect(screen.getByText(/в счёт комиссии:/)).toBeInTheDocument();
  });

  it("should render a remainder below one rouble with kopecks", () => {
    renderWithTheme(<CommissionBadge credit={{ amount: 0.55, state: "FACT" }} />);

    expect(screen.getByText(/0,55/)).toBeInTheDocument();
  });
});
