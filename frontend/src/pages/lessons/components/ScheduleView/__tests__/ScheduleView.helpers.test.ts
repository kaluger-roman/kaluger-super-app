import { describe, it, expect } from "vitest";

import {
  generateTimeSlots,
  generateDateRange,
  getDateKey,
  formatDayHeader,
} from "../ScheduleView.helpers";

describe("generateTimeSlots", () => {
  it("should generate time slots from start to end hour", () => {
    const result = generateTimeSlots(8, 12);

    expect(result).toEqual(["08:00", "09:00", "10:00", "11:00"]);
  });

  it("should pad single digit hours with zero", () => {
    const result = generateTimeSlots(5, 8);

    expect(result).toEqual(["05:00", "06:00", "07:00"]);
  });

  it("should handle double digit hours", () => {
    const result = generateTimeSlots(10, 13);

    expect(result).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("should return empty array when start equals end", () => {
    const result = generateTimeSlots(10, 10);

    expect(result).toEqual([]);
  });

  it("should return empty array when start is greater than end", () => {
    const result = generateTimeSlots(12, 10);

    expect(result).toEqual([]);
  });
});

describe("generateDateRange", () => {
  it("should generate dates around center date", () => {
    const centerDate = new Date("2026-01-15T12:00:00.000Z");

    const result = generateDateRange(centerDate, 2);

    expect(result).toHaveLength(5); // -2, -1, 0, +1, +2
    expect(getDateKey(result[0])).toBe("2026-01-13");
    expect(getDateKey(result[1])).toBe("2026-01-14");
    expect(getDateKey(result[2])).toBe("2026-01-15");
    expect(getDateKey(result[3])).toBe("2026-01-16");
    expect(getDateKey(result[4])).toBe("2026-01-17");
  });

  it("should use default daysAround of 30", () => {
    const centerDate = new Date("2026-01-15T12:00:00.000Z");

    const result = generateDateRange(centerDate);

    expect(result).toHaveLength(61); // -30 to +30 inclusive
  });

  it("should handle daysAround of 0", () => {
    const centerDate = new Date("2026-01-15T12:00:00.000Z");

    const result = generateDateRange(centerDate, 0);

    expect(result).toHaveLength(1);
    expect(getDateKey(result[0])).toBe("2026-01-15");
  });

  it("should handle month boundaries", () => {
    const centerDate = new Date("2026-01-01T12:00:00.000Z");

    const result = generateDateRange(centerDate, 2);

    expect(getDateKey(result[0])).toBe("2025-12-30");
    expect(getDateKey(result[1])).toBe("2025-12-31");
    expect(getDateKey(result[2])).toBe("2026-01-01");
    expect(getDateKey(result[3])).toBe("2026-01-02");
    expect(getDateKey(result[4])).toBe("2026-01-03");
  });
});

describe("getDateKey", () => {
  it("should return date in YYYY-MM-DD format", () => {
    const date = new Date("2026-01-15T10:30:45.123Z");

    const result = getDateKey(date);

    expect(result).toBe("2026-01-15");
  });

  it("should handle single digit months and days", () => {
    const date = new Date("2026-03-05T00:00:00.000Z");

    const result = getDateKey(date);

    expect(result).toBe("2026-03-05");
  });

  it("should ignore time component", () => {
    const date1 = new Date("2026-01-15T00:00:00.000Z");
    const date2 = new Date("2026-01-15T23:59:59.999Z");

    expect(getDateKey(date1)).toBe(getDateKey(date2));
  });
});

describe("formatDayHeader", () => {
  it("should format day header with correct data", () => {
    const date = new Date("2026-01-15T12:00:00.000Z");

    const result = formatDayHeader(date);

    expect(result.dayName).toBeDefined();
    expect(result.dayNumber).toBe(15);
    expect(result.monthName).toBeDefined();
    expect(typeof result.isToday).toBe("boolean");
  });

  it("should mark today correctly", () => {
    const today = new Date();

    const result = formatDayHeader(today);

    expect(result.isToday).toBe(true);
  });

  it("should not mark yesterday as today", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = formatDayHeader(yesterday);

    expect(result.isToday).toBe(false);
  });

  it("should not mark tomorrow as today", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = formatDayHeader(tomorrow);

    expect(result.isToday).toBe(false);
  });

  it("should handle first day of month", () => {
    const date = new Date("2026-01-01T12:00:00.000Z");

    const result = formatDayHeader(date);

    expect(result.dayNumber).toBe(1);
  });

  it("should handle last day of month", () => {
    const date = new Date("2026-01-31T12:00:00.000Z");

    const result = formatDayHeader(date);

    expect(result.dayNumber).toBe(31);
  });
});
