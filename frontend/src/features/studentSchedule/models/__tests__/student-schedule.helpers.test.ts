import { describe, expect, it } from "vitest";

import type { StudentVisibleLesson } from "@shared";

import {
  addDays,
  formatLessonDuration,
  formatLessonTime,
  formatRangeLabel,
  getWeekStart,
  groupLessonsByDay,
  statusLabel,
  subjectLabel,
  toIsoDate,
} from "../student-schedule.helpers";

describe("studentSchedule.helpers", () => {
  describe("getWeekStart", () => {
    it("returns Monday 00:00 for a Wednesday", () => {
      const wed = new Date(2026, 4, 6); // 6 May 2026 — Wednesday (locale-agnostic)
      const start = getWeekStart(wed);
      expect(start.getDay()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });

    it("returns Monday of the same week for a Sunday", () => {
      const sun = new Date(2026, 4, 10); // 10 May 2026 — Sunday
      const start = getWeekStart(sun);
      expect(start.getDay()).toBe(1);
      // Difference between Sunday and prior Monday is 6 days.
      expect(sun.getDate() - start.getDate()).toBe(6);
    });
  });

  describe("addDays", () => {
    it("does not mutate the original date", () => {
      const original = new Date(2026, 4, 4);
      const shifted = addDays(original, 7);
      expect(shifted.getDate()).toBe(11);
      expect(original.getDate()).toBe(4);
    });
  });

  describe("toIsoDate", () => {
    it("formats as YYYY-MM-DD with leading zeros", () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
  });

  describe("formatRangeLabel", () => {
    it("includes start day, end day and year", () => {
      const monday = new Date(2026, 4, 4);
      const label = formatRangeLabel(monday);
      expect(label).toContain("—");
      expect(label).toMatch(/2026/);
    });
  });

  describe("groupLessonsByDay", () => {
    it("groups by day key and sorts lessons within a day by startTime", () => {
      const a: StudentVisibleLesson = {
        id: "a",
        subject: "MATHEMATICS",
        startTime: "2026-05-04T10:00:00.000Z",
        endTime: "2026-05-04T11:00:00.000Z",
        status: "SCHEDULED",
      };
      const b: StudentVisibleLesson = {
        id: "b",
        subject: "PHYSICS",
        startTime: "2026-05-04T08:00:00.000Z",
        endTime: "2026-05-04T09:00:00.000Z",
        status: "SCHEDULED",
      };
      const c: StudentVisibleLesson = {
        id: "c",
        subject: "MATHEMATICS",
        startTime: "2026-05-05T14:00:00.000Z",
        endTime: "2026-05-05T15:00:00.000Z",
        status: "SCHEDULED",
      };

      const grouped = groupLessonsByDay([a, b, c]);
      const keys = Object.keys(grouped);
      expect(keys).toHaveLength(2);
      const firstDay = grouped[keys[0]];
      expect(firstDay.map((l) => l.id)).toEqual(["b", "a"]);
    });
  });

  describe("formatLessonTime / formatLessonDuration", () => {
    it("formats HH:MM time", () => {
      const formatted = formatLessonTime("2026-05-04T10:30:00.000Z");
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it("formats 30 минут duration", () => {
      expect(
        formatLessonDuration(
          "2026-05-04T10:00:00.000Z",
          "2026-05-04T10:30:00.000Z"
        )
      ).toBe("30мин");
    });

    it("formats 90 минут duration", () => {
      expect(
        formatLessonDuration(
          "2026-05-04T10:00:00.000Z",
          "2026-05-04T11:30:00.000Z"
        )
      ).toBe("1ч 30мин");
    });

    it("formats whole-hour duration", () => {
      expect(
        formatLessonDuration(
          "2026-05-04T10:00:00.000Z",
          "2026-05-04T12:00:00.000Z"
        )
      ).toBe("2ч 0мин");
    });
  });

  describe("subjectLabel / statusLabel", () => {
    it("returns Russian subject labels", () => {
      expect(subjectLabel("MATHEMATICS")).toBe("Математика");
      expect(subjectLabel("PHYSICS")).toBe("Физика");
    });

    it("returns Russian status labels for all known statuses", () => {
      expect(statusLabel("SCHEDULED")).toBe("Запланирован");
      expect(statusLabel("COMPLETED")).toBe("Завершён");
      expect(statusLabel("CANCELLED")).toBe("Отменён");
      expect(statusLabel("RESCHEDULED")).toBe("Перенесён");
      expect(statusLabel("IN_PROGRESS")).toBe("Идёт сейчас");
    });
  });
});
