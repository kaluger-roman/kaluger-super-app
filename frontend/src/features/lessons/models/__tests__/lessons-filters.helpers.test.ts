import { describe, it, expect } from "vitest";

import {
  toLocalStartOfDay,
  toLocalEndOfDay,
  calculatePresetDates,
  buildLessonFilterParams,
  buildPagedLessonParams,
} from "../lessons-filters.helpers";

describe("toLocalStartOfDay", () => {
  it("should set time to 00:00:00.000 in local timezone and return ISO string", () => {
    const date = new Date(2026, 2, 15, 14, 30, 45, 123); // March 15, 2026 14:30:45
    const result = toLocalStartOfDay(date);
    const parsed = new Date(result);

    // Reconstruct expected: March 15 at midnight local → UTC
    const expected = new Date(2026, 2, 15, 0, 0, 0, 0);
    expect(parsed.getTime()).toBe(expected.getTime());
  });

  it("should not mutate the original date", () => {
    const date = new Date(2026, 5, 10, 18, 0);
    const original = date.getTime();
    toLocalStartOfDay(date);
    expect(date.getTime()).toBe(original);
  });

  it("should return a valid ISO string", () => {
    const result = toLocalStartOfDay(new Date());
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});

describe("toLocalEndOfDay", () => {
  it("should set time to 23:59:59.999 in local timezone and return ISO string", () => {
    const date = new Date(2026, 2, 15, 8, 0, 0, 0);
    const result = toLocalEndOfDay(date);
    const parsed = new Date(result);

    const expected = new Date(2026, 2, 15, 23, 59, 59, 999);
    expect(parsed.getTime()).toBe(expected.getTime());
  });

  it("should not mutate the original date", () => {
    const date = new Date(2026, 5, 10, 18, 0);
    const original = date.getTime();
    toLocalEndOfDay(date);
    expect(date.getTime()).toBe(original);
  });
});

describe("calculatePresetDates", () => {
  it("should return first and last day of current month for currentMonth preset", () => {
    const { from, to } = calculatePresetDates("currentMonth");
    const now = new Date();

    expect(from.getFullYear()).toBe(now.getFullYear());
    expect(from.getMonth()).toBe(now.getMonth());
    expect(from.getDate()).toBe(1);

    expect(to.getFullYear()).toBe(now.getFullYear());
    expect(to.getMonth()).toBe(now.getMonth());
    // Last day of month: day 0 of next month
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(to.getDate()).toBe(lastDay);
  });

  it("should return first and last day of previous month for lastMonth preset", () => {
    const { from, to } = calculatePresetDates("lastMonth");
    const now = new Date();
    const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const expectedYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    expect(from.getFullYear()).toBe(expectedYear);
    expect(from.getMonth()).toBe(expectedMonth);
    expect(from.getDate()).toBe(1);

    const lastDay = new Date(expectedYear, expectedMonth + 1, 0).getDate();
    expect(to.getDate()).toBe(lastDay);
  });

  it("should return Monday to Sunday of current week for currentWeek preset", () => {
    const { from, to } = calculatePresetDates("currentWeek");

    // from should be Monday
    const day = from.getDay();
    expect(day).toBe(1); // Monday

    // to should be Sunday (6 days after Monday)
    const diff = to.getTime() - from.getTime();
    const daysDiff = diff / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBe(6);

    const toDay = to.getDay();
    expect(toDay).toBe(0); // Sunday
  });
});

describe("buildLessonFilterParams", () => {
  it("should pass through filter flags and omit null payment dates", () => {
    expect(
      buildLessonFilterParams({
        onlyUnpaid: true,
        onlyWithoutHomework: false,
        paymentDateFrom: null,
        paymentDateTo: null,
      })
    ).toEqual({ onlyUnpaid: true, onlyWithoutHomework: false });
  });

  it("should convert payment dates to start/end-of-day ISO strings when provided", () => {
    const result = buildLessonFilterParams({
      onlyUnpaid: false,
      onlyWithoutHomework: false,
      paymentDateFrom: new Date(2026, 2, 15, 14, 30),
      paymentDateTo: new Date(2026, 2, 20, 8, 0),
    });

    expect(result.paymentDateFrom).toBeDefined();
    expect(result.paymentDateTo).toBeDefined();
    expect(new Date(String(result.paymentDateFrom)).getHours()).toBe(0);
    expect(new Date(String(result.paymentDateTo)).getHours()).toBe(23);
  });
});

describe("buildPagedLessonParams", () => {
  it("should add page and limit to the filter params", () => {
    expect(
      buildPagedLessonParams(
        { onlyUnpaid: false, onlyWithoutHomework: true, paymentDateFrom: null, paymentDateTo: null },
        3,
        10
      )
    ).toEqual({ page: 3, limit: 10, onlyUnpaid: false, onlyWithoutHomework: true });
  });
});
