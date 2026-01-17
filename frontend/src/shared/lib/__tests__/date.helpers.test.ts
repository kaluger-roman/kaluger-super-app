import { describe, it, expect } from "vitest";

import { formatDate, formatDateTime, formatTime, formatDuration, toDateKey } from "../date.helpers";

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
});
