import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider } from "effector-react";
import { describe, it, expect } from "vitest";

import { lessonModel } from "@entities";
import { lessonsModel } from "@features";
import { theme } from "@shared";

import { PaymentsSummaryBar } from "../PaymentsSummaryBar";

const renderWithScope = (scope: ReturnType<typeof fork>) =>
  render(
    <Provider value={scope}>
      <ThemeProvider theme={theme}>
        <PaymentsSummaryBar />
      </ThemeProvider>
    </Provider>,
  );

describe("PaymentsSummaryBar", () => {
  it("should not render when payment filter is not active", () => {
    const scope = fork({
      values: [
        [lessonsModel.$paymentDateFrom, null],
        [lessonsModel.$paymentDateTo, null],
        [lessonModel.$paymentsSummary, { sum: 1000, count: 2 }],
      ],
    });

    const { container } = renderWithScope(scope);

    expect(container).toBeEmptyDOMElement();
  });

  it("should not render when paymentsSummary is null even if filter is active", () => {
    const scope = fork({
      values: [
        [lessonsModel.$paymentDateFrom, new Date("2026-03-01")],
        [lessonsModel.$paymentDateTo, new Date("2026-03-31")],
        [lessonModel.$paymentsSummary, null],
      ],
    });

    const { container } = renderWithScope(scope);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render sum and lesson count when filter is active", () => {
    const scope = fork({
      values: [
        [lessonsModel.$paymentDateFrom, new Date("2026-03-01")],
        [lessonsModel.$paymentDateTo, new Date("2026-03-31")],
        [lessonModel.$paymentsSummary, { sum: 42000, count: 7 }],
      ],
    });

    renderWithScope(scope);

    expect(screen.getByText(/Оплачено за период/)).toBeInTheDocument();
    expect(screen.getByText(/42\s?000/)).toBeInTheDocument();
    expect(screen.getByText(/7 уроков/)).toBeInTheDocument();
  });

  it("should render when only one of the dates is set", () => {
    const scope = fork({
      values: [
        [lessonsModel.$paymentDateFrom, new Date("2026-03-01")],
        [lessonsModel.$paymentDateTo, null],
        [lessonModel.$paymentsSummary, { sum: 500, count: 1 }],
      ],
    });

    renderWithScope(scope);

    expect(screen.getByText(/Оплачено за период/)).toBeInTheDocument();
    expect(screen.getByText(/1 уроков/)).toBeInTheDocument();
  });
});
