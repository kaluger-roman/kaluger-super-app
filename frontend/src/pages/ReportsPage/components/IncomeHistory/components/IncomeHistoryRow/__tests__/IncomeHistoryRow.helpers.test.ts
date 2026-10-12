import { describe, it, expect } from "vitest";

import { makeEntry } from "../../../__tests__/incomeHistory.fixtures";
import {
  formatEntryLessonLine,
  getEntryName,
  getEntryStatusColor,
  getEntryStatusLabel,
} from "../IncomeHistoryRow.helpers";

describe("getEntryName", () => {
  it("should prefer the student name", () => {
    expect(getEntryName(makeEntry({ prospectName: "Пётр" }))).toBe("Анна Смирнова");
  });

  it("should fall back to the trial contact name", () => {
    expect(getEntryName(makeEntry({ student: null, prospectName: "Пётр" }))).toBe("Пётр");
  });

  it("should return an empty string without any name", () => {
    expect(getEntryName(makeEntry({ student: null, prospectName: null }))).toBe("");
  });
});

describe("formatEntryLessonLine", () => {
  it("should join subject, type, lesson date and time range", () => {
    expect(formatEntryLessonLine(makeEntry({ subject: "PHYSICS", lessonType: "OGE" }))).toMatch(
      /^Физика · ОГЭ · урок 13 окт\.?, 16:00—17:30$/
    );
  });
});

describe("getEntryStatusLabel / getEntryStatusColor", () => {
  it("should call a scheduled lesson upcoming", () => {
    expect(getEntryStatusLabel("SCHEDULED")).toBe("Предстоящий");
    expect(getEntryStatusColor("SCHEDULED")).toBe("info");
  });

  it("should reuse the common status labels and colors for other statuses", () => {
    expect(getEntryStatusLabel("CANCELLED")).toBe("Отменен");
    expect(getEntryStatusColor("CANCELLED")).toBe("error");
    expect(getEntryStatusLabel("RESCHEDULED")).toBe("Перенесен");
    expect(getEntryStatusColor("RESCHEDULED")).toBe("warning");
  });
});
