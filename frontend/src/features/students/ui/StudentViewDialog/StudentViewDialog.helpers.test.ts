import { describe, it, expect } from "vitest";

import { formatDate } from "./StudentViewDialog.helpers";

describe("StudentViewDialog.helpers", () => {
  describe("formatDate", () => {
    it("should format date in Russian locale", () => {
      const formatted = formatDate("2024-01-15T10:00:00Z");
      expect(formatted).toBe("15 января 2024 г.");
    });

    it("should format different months correctly", () => {
      expect(formatDate("2024-02-20T10:00:00Z")).toBe("20 февраля 2024 г.");
      expect(formatDate("2024-03-05T10:00:00Z")).toBe("5 марта 2024 г.");
      expect(formatDate("2024-12-31T10:00:00Z")).toBe("31 декабря 2024 г.");
    });

    it("should handle single digit days", () => {
      const formatted = formatDate("2024-01-01T10:00:00Z");
      expect(formatted).toBe("1 января 2024 г.");
    });

    it("should handle different years", () => {
      const formatted = formatDate("2023-06-15T10:00:00Z");
      expect(formatted).toContain("2023");
    });

    it("should handle ISO date strings", () => {
      const formatted = formatDate("2024-12-25T15:30:45.123Z");
      expect(formatted).toBe("25 декабря 2024 г.");
    });
  });
});
