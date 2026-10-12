import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";
import type { IncomeHistoryDay as IncomeHistoryDayData } from "@shared";

import { makeDay, makeEntry, money } from "../../../__tests__/incomeHistory.fixtures";
import { IncomeHistoryDay } from "../IncomeHistoryDay";
import { formatHistoryDayLabel } from "../IncomeHistoryDay.helpers";

const renderDay = (day: IncomeHistoryDayData) =>
  render(
    <ThemeProvider theme={theme}>
      <IncomeHistoryDay day={day} />
    </ThemeProvider>
  );

const twoEntries = [
  makeEntry({ lessonId: "a", receivedAmount: 1500.5, price: 1500.5 }),
  makeEntry({ lessonId: "b", receivedAmount: 1500, price: 1500 }),
];

describe("IncomeHistoryDay", () => {
  it("should show the day label, the number of payments and the total with kopecks", () => {
    renderDay(makeDay("2026-09-25", twoEntries));

    expect(screen.getByText(formatHistoryDayLabel("2026-09-25"))).toBeInTheDocument();
    expect(screen.getByText("2 оплаты")).toBeInTheDocument();
    expect(screen.getByText(money(3000.5, true))).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("should show the day tax only when the server sends it", () => {
    const { unmount } = renderDay(makeDay("2026-09-25", twoEntries, { taxTotal: 180 }));
    expect(screen.getByText(`налог ${money(180)}`)).toBeInTheDocument();
    unmount();

    renderDay(makeDay("2026-09-25", twoEntries));
    expect(screen.queryByText(/^налог /)).toBeNull();
  });
});

describe("formatHistoryDayLabel", () => {
  it("should capitalize the weekday", () => {
    const label = formatHistoryDayLabel("2026-09-25");

    expect(label).toMatch(/^Пятница, 25 сентября/);
  });
});
