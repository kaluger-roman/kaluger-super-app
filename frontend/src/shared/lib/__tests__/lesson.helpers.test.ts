import { describe, it, expect } from "vitest";

import type { Lesson } from "../../types";
import {
  getLessonDisplayName,
  getStatusLabel,
  getStatusColor,
  formatLessonTime,
  formatTimeForCell,
  formatTimeFromString,
  formatDateTimeLong,
  isProspectLesson,
} from "../lesson.helpers";

describe("lesson.helpers", () => {
  describe("getStatusLabel", () => {
    it("should return correct label for SCHEDULED", () => {
      expect(getStatusLabel("SCHEDULED")).toBe("Запланирован");
    });

    it("should return correct label for COMPLETED", () => {
      expect(getStatusLabel("COMPLETED")).toBe("Завершен");
    });

    it("should return correct label for CANCELLED", () => {
      expect(getStatusLabel("CANCELLED")).toBe("Отменен");
    });

    it("should return correct label for RESCHEDULED", () => {
      expect(getStatusLabel("RESCHEDULED")).toBe("Перенесен");
    });

    it("should return correct label for IN_PROGRESS", () => {
      expect(getStatusLabel("IN_PROGRESS")).toBe("В процессе");
    });

    it("should return empty string for unknown status", () => {
      expect(getStatusLabel("UNKNOWN" as Lesson["status"])).toBe("");
    });
  });

  describe("getStatusColor", () => {
    it("should return success for COMPLETED", () => {
      expect(getStatusColor("COMPLETED")).toBe("success");
    });

    it("should return error for CANCELLED", () => {
      expect(getStatusColor("CANCELLED")).toBe("error");
    });

    it("should return warning for RESCHEDULED", () => {
      expect(getStatusColor("RESCHEDULED")).toBe("warning");
    });

    it("should return info for IN_PROGRESS", () => {
      expect(getStatusColor("IN_PROGRESS")).toBe("info");
    });

    it("should return default for SCHEDULED", () => {
      expect(getStatusColor("SCHEDULED")).toBe("default");
    });

    it("should return default for unknown status", () => {
      expect(getStatusColor("UNKNOWN" as Lesson["status"])).toBe("default");
    });
  });

  describe("formatLessonTime", () => {
    it("should format lesson time range", () => {
      const start = "2024-03-15T14:00:00";
      const end = "2024-03-15T15:30:00";
      const result = formatLessonTime(start, end);
      expect(result).toContain("15.03.2024");
      expect(result).toContain("14:00");
      expect(result).toContain("15:30");
    });

    it("should handle same day with different times", () => {
      const start = "2024-03-15T09:00:00";
      const end = "2024-03-15T10:00:00";
      const result = formatLessonTime(start, end);
      expect(result).toContain("09:00");
      expect(result).toContain("10:00");
    });
  });

  describe("formatTimeForCell", () => {
    it("should format time for display in cell", () => {
      const date = new Date("2024-03-15T14:30:00");
      expect(formatTimeForCell(date)).toBe("14:30");
    });

    it("should handle midnight", () => {
      const date = new Date("2024-03-15T00:00:00");
      expect(formatTimeForCell(date)).toBe("00:00");
    });

    it("should handle single digit hours", () => {
      const date = new Date("2024-03-15T09:05:00");
      expect(formatTimeForCell(date)).toBe("09:05");
    });
  });

  describe("formatTimeFromString", () => {
    it("should format time from ISO string", () => {
      expect(formatTimeFromString("2024-03-15T14:30:00")).toBe("14:30");
    });

    it("should handle midnight", () => {
      expect(formatTimeFromString("2024-03-15T00:00:00")).toBe("00:00");
    });

    it("should handle end of day", () => {
      expect(formatTimeFromString("2024-03-15T23:59:00")).toBe("23:59");
    });
  });

  describe("formatDateTimeLong", () => {
    it("should format datetime in long format", () => {
      const result = formatDateTimeLong("2024-03-15T14:30:00");
      expect(result).toContain("2024");
      expect(result).toContain("14:30");
    });

    it("should include weekday in format", () => {
      const result = formatDateTimeLong("2024-03-15T14:30:00");
      expect(result.length).toBeGreaterThan(20);
    });
  });

  describe("getLessonDisplayName", () => {
    it("should return student name when student is present", () => {
      expect(
        getLessonDisplayName({
          student: { name: "Иван Иванов" } as Lesson["student"],
          prospectName: null,
        })
      ).toBe("Иван Иванов");
    });

    it("should return prospect name when student is absent", () => {
      expect(
        getLessonDisplayName({ student: undefined, prospectName: "Пётр (пробный)" })
      ).toBe("Пётр (пробный)");
    });

    it("should return empty string when neither student nor prospect name present", () => {
      expect(getLessonDisplayName({ student: undefined, prospectName: null })).toBe("");
    });
  });

  describe("isProspectLesson", () => {
    it("should return true when studentId is null", () => {
      expect(isProspectLesson({ studentId: null })).toBe(true);
    });

    it("should return false when studentId is set", () => {
      expect(isProspectLesson({ studentId: "student-1" })).toBe(false);
    });
  });
});
