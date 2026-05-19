import { describe, it, expect } from "vitest";

import {
  addDays,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  formatTimeRange,
  getWeekEnd,
  getWeekStart,
  groupByDay,
  toDateKey,
} from "../date.helpers";

describe("date.helpers", () => {
  describe("formatDate", () => {
    it("should format Date object correctly", () => {
      const date = new Date("2024-03-15T14:30:00");
      expect(formatDate(date)).toBe("15.03.2024");
    });

    it("should format ISO string correctly", () => {
      expect(formatDate("2024-03-15T14:30:00")).toBe("15.03.2024");
    });

    it("should return empty string for invalid date", () => {
      expect(formatDate("invalid")).toBe("");
    });

    it("should return empty string for malformed date", () => {
      expect(formatDate("")).toBe("");
    });

    it("should handle edge case dates", () => {
      expect(formatDate("2024-01-01T00:00:00")).toBe("01.01.2024");
      expect(formatDate("2024-12-31T23:59:59")).toBe("31.12.2024");
    });
  });

  describe("formatDateTime", () => {
    it("should format Date object with time", () => {
      const date = new Date("2024-03-15T14:30:00");
      expect(formatDateTime(date)).toBe("15.03.2024 14:30");
    });

    it("should format ISO string with time", () => {
      expect(formatDateTime("2024-03-15T14:30:00")).toBe("15.03.2024 14:30");
    });

    it("should return empty string for invalid date", () => {
      expect(formatDateTime("invalid")).toBe("");
    });

    it("should handle midnight correctly", () => {
      expect(formatDateTime("2024-03-15T00:00:00")).toBe("15.03.2024 00:00");
    });

    it("should handle end of day correctly", () => {
      expect(formatDateTime("2024-03-15T23:59:00")).toBe("15.03.2024 23:59");
    });
  });

  describe("formatTime", () => {
    it("should format time from Date object", () => {
      const date = new Date("2024-03-15T14:30:00");
      expect(formatTime(date)).toBe("14:30");
    });

    it("should format time from ISO string", () => {
      expect(formatTime("2024-03-15T09:05:00")).toBe("09:05");
    });

    it("should return empty string for invalid date", () => {
      expect(formatTime("invalid")).toBe("");
    });

    it("should handle midnight", () => {
      expect(formatTime("2024-03-15T00:00:00")).toBe("00:00");
    });

    it("should handle single digit hours and minutes", () => {
      expect(formatTime("2024-03-15T09:05:00")).toBe("09:05");
    });
  });

  describe("formatDuration", () => {
    it("should format duration in hours and minutes", () => {
      const start = "2024-03-15T14:00:00";
      const end = "2024-03-15T16:30:00";
      expect(formatDuration(start, end)).toBe("2ч 30мин");
    });

    it("should format duration with only minutes", () => {
      const start = "2024-03-15T14:00:00";
      const end = "2024-03-15T14:45:00";
      expect(formatDuration(start, end)).toBe("45мин");
    });

    it("should handle Date objects", () => {
      const start = new Date("2024-03-15T14:00:00");
      const end = new Date("2024-03-15T15:30:00");
      expect(formatDuration(start, end)).toBe("1ч 30мин");
    });

    it("should return empty string for invalid start date", () => {
      expect(formatDuration("invalid", "2024-03-15T15:00:00")).toBe("");
    });

    it("should return empty string for invalid end date", () => {
      expect(formatDuration("2024-03-15T14:00:00", "invalid")).toBe("");
    });

    it("should handle exactly one hour", () => {
      const start = "2024-03-15T14:00:00";
      const end = "2024-03-15T15:00:00";
      expect(formatDuration(start, end)).toBe("1ч 0мин");
    });

    it("should handle zero minutes", () => {
      const start = "2024-03-15T14:00:00";
      const end = "2024-03-15T16:00:00";
      expect(formatDuration(start, end)).toBe("2ч 0мин");
    });

    it("should handle very short durations", () => {
      const start = "2024-03-15T14:00:00";
      const end = "2024-03-15T14:15:00";
      expect(formatDuration(start, end)).toBe("15мин");
    });
  });

  describe("toDateKey", () => {
    it("should convert Date object to YYYY-MM-DD format", () => {
      const date = new Date("2024-03-15T14:30:00");
      expect(toDateKey(date)).toBe("2024-03-15");
    });

    it("should convert ISO string to YYYY-MM-DD format", () => {
      expect(toDateKey("2024-03-15T14:30:00")).toBe("2024-03-15");
    });

    it("should return empty string for null", () => {
      expect(toDateKey(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(toDateKey(undefined)).toBe("");
    });

    it("should return empty string for invalid date string", () => {
      expect(toDateKey("invalid")).toBe("");
    });

    it("should return empty string for empty string", () => {
      expect(toDateKey("")).toBe("");
    });

    it("should handle dates with single digit days and months", () => {
      expect(toDateKey("2024-01-05T14:30:00")).toBe("2024-01-05");
    });

    it("should handle end of year dates", () => {
      expect(toDateKey("2024-12-31T23:59:59")).toBe("2024-12-31");
    });
  });

  describe("addDays", () => {
    it("adds positive offset and does not mutate input", () => {
      const original = new Date(2026, 4, 4);
      const shifted = addDays(original, 7);
      expect(shifted.getDate()).toBe(11);
      expect(original.getDate()).toBe(4);
    });

    it("subtracts when offset is negative", () => {
      const result = addDays(new Date(2026, 4, 7), -3);
      expect(result.getDate()).toBe(4);
    });

    it("accepts ISO string input", () => {
      const result = addDays("2026-05-04T00:00:00", 1);
      expect(result.getDate()).toBe(5);
    });
  });

  describe("getWeekStart", () => {
    it("returns Monday 00:00 for a Wednesday", () => {
      const start = getWeekStart(new Date(2026, 4, 6));
      expect(start.getDay()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });

    it("returns Monday of the same week for a Sunday", () => {
      const sunday = new Date(2026, 4, 10);
      const start = getWeekStart(sunday);
      expect(start.getDay()).toBe(1);
      expect(sunday.getDate() - start.getDate()).toBe(6);
    });

    it("does not mutate the input", () => {
      const original = new Date(2026, 4, 6);
      const originalDate = original.getDate();
      getWeekStart(original);
      expect(original.getDate()).toBe(originalDate);
    });
  });

  describe("getWeekEnd", () => {
    it("returns Sunday 23:59:59.999 of the same week", () => {
      const end = getWeekEnd(new Date(2026, 4, 6));
      expect(end.getDay()).toBe(0);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  describe("formatTimeRange", () => {
    it("joins start/end with em-dash", () => {
      const range = formatTimeRange(
        "2026-05-04T10:00:00",
        "2026-05-04T11:30:00"
      );
      expect(range).toMatch(/^\d{2}:\d{2}—\d{2}:\d{2}$/);
    });
  });

  describe("groupByDay", () => {
    type Item = { id: string; start: string };

    it("groups items by day and sorts inside each group by startTime", () => {
      const items: Item[] = [
        { id: "a", start: "2026-05-04T10:00:00" },
        { id: "b", start: "2026-05-04T08:00:00" },
        { id: "c", start: "2026-05-05T14:00:00" },
      ];
      const grouped = groupByDay(items, (i) => i.start);
      const keys = Object.keys(grouped);
      expect(keys).toHaveLength(2);
      expect(grouped[keys[0]].map((i) => i.id)).toEqual(["b", "a"]);
      expect(grouped[keys[1]].map((i) => i.id)).toEqual(["c"]);
    });

    it("returns an empty object for an empty input", () => {
      expect(groupByDay([] as Item[], (i) => i.start)).toEqual({});
    });

    it("accepts items whose start is a Date object", () => {
      type DateItem = { id: string; start: Date };
      const items: DateItem[] = [
        { id: "a", start: new Date(2026, 4, 4, 10) },
      ];
      expect(Object.keys(groupByDay(items, (i) => i.start))).toHaveLength(1);
    });
  });

  // formatDuration / formatTime — старые тесты выше; здесь только новые edge-кейсы
  describe("formatDuration edge cases", () => {
    it("returns empty string for invalid input", () => {
      expect(formatDuration("invalid", "2026-05-04T10:00:00")).toBe("");
    });
  });

  describe("formatTime edge case", () => {
    it("returns empty string for invalid input", () => {
      expect(formatTime("invalid")).toBe("");
    });
  });
});
