import { describe, it, expect } from "vitest";

import { formatWeekRange } from "@shared";

import { formatAppliedPeriod, formatPaymentsCount } from "../IncomeHistory.helpers";

describe("formatPaymentsCount", () => {
  it.each([
    [1, "1 оплата"],
    [2, "2 оплаты"],
    [4, "4 оплаты"],
    [5, "5 оплат"],
    [11, "11 оплат"],
    [12, "12 оплат"],
    [14, "14 оплат"],
    [21, "21 оплата"],
    [22, "22 оплаты"],
    [0, "0 оплат"],
  ])("should format %i as «%s»", (count, expected) => {
    expect(formatPaymentsCount(count)).toBe(expected);
  });
});

describe("formatAppliedPeriod", () => {
  it("should format the applied period", () => {
    const range = { startDate: "2026-09-01T00:00:00.000Z", endDate: "2026-09-30T20:00:00.000Z" };
    expect(formatAppliedPeriod(range)).toBe(formatWeekRange(range.startDate, range.endDate));
  });

  it("should name the start year when the period spans two years", () => {
    const range = {
      startDate: new Date(2025, 11, 1).toISOString(),
      endDate: new Date(2026, 7, 12, 23, 59).toISOString(),
    };
    expect(formatAppliedPeriod(range)).toBe("1 декабря 2025 г. — 12 августа 2026 г.");
  });

  it("should return an empty string before a period is applied", () => {
    expect(formatAppliedPeriod(null)).toBe("");
  });
});
