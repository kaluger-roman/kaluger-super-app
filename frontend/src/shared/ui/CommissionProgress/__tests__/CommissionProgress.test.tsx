import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "../../themeConfig";
import { CommissionProgress } from "../CommissionProgress";
import {
  getCommissionPercent,
  getCommissionRemaining,
  isCommissionClosed,
} from "../CommissionProgress.helpers";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("CommissionProgress helpers", () => {
  it("should never report a negative remaining amount", () => {
    expect(getCommissionRemaining(1000, 1500)).toBe(0);
  });

  it("should compute the repaid percentage", () => {
    expect(getCommissionPercent(2000, 500)).toBe(25);
  });

  it("should cap the percentage at one hundred", () => {
    expect(getCommissionPercent(1000, 5000)).toBe(100);
  });

  // Regression: rounding up showed a full bar while money was still owed.
  it("should stay below one hundred percent while anything remains", () => {
    expect(getCommissionPercent(10000, 9999)).toBe(99);
  });

  it("should report zero percent for a zero commission", () => {
    expect(getCommissionPercent(0, 0)).toBe(0);
  });

  it("should treat an over-repaid commission as closed", () => {
    expect(isCommissionClosed(1000, 1500)).toBe(true);
  });

  it("should not treat a zero commission as closed", () => {
    expect(isCommissionClosed(0, 0)).toBe(false);
    expect(isCommissionClosed(null, null)).toBe(false);
  });
});

describe("CommissionProgress", () => {
  it("should render nothing without a commission", () => {
    const { container } = renderWithTheme(<CommissionProgress amount={0} repaid={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when the commission is missing", () => {
    const { container } = renderWithTheme(<CommissionProgress />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should show commission, repaid and remaining rows for a partial repayment", () => {
    renderWithTheme(<CommissionProgress amount={3000} repaid={1200} />);

    expect(screen.getByText("Погашение комиссии")).toBeInTheDocument();
    expect(screen.getByText("Комиссия")).toBeInTheDocument();
    expect(screen.getByText("Погашено")).toBeInTheDocument();
    expect(screen.getByText("Осталось")).toBeInTheDocument();
    expect(screen.getByText(/3.*000.*₽/)).toBeInTheDocument();
    expect(screen.getByText(/1.*200.*₽/)).toBeInTheDocument();
    expect(screen.getByText(/1.*800.*₽/)).toBeInTheDocument();
  });

  it("should replace the accent block with a quiet line when the commission is closed", () => {
    renderWithTheme(<CommissionProgress amount={3000} repaid={3000} />);

    expect(screen.getByText(/выплачена/)).toBeInTheDocument();
    expect(screen.queryByText("Погашение комиссии")).toBeNull();
    expect(screen.queryByLabelText("Прогресс погашения комиссии")).toBeNull();
  });

  it("should render a single summary line in the compact variant", () => {
    renderWithTheme(<CommissionProgress amount={3000} repaid={1200} variant="compact" />);

    expect(screen.getByText(/Комиссия .* · погашено .* · осталось/)).toBeInTheDocument();
    expect(screen.queryByText("Погашение комиссии")).toBeNull();
  });

  it("should show a fractional remainder with kopecks", () => {
    renderWithTheme(<CommissionProgress amount={1000.55} repaid={1000} />);

    expect(screen.getByText("0,55 ₽")).toBeInTheDocument();
  });

  it("should expose the progress bar to assistive technology", () => {
    renderWithTheme(<CommissionProgress amount={2000} repaid={1000} />);

    expect(screen.getByLabelText("Прогресс погашения комиссии")).toBeInTheDocument();
  });
});

describe("CommissionProgress without derived fields", () => {
  // Regression: the API omits commissionRepaid when it could not compute it,
  // and rendering it as 0 claimed nothing had been repaid.
  it("should render nothing when the repaid amount is missing", () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommissionProgress amount={3000} repaid={undefined} />
      </ThemeProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when the repaid amount is null", () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommissionProgress amount={3000} repaid={null} />
      </ThemeProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
