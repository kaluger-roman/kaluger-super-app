import { describe, expect, it } from "vitest";

import {
  formatCallDuration,
  formatCallLesson,
  formatCallLessonSubject,
  formatCallLessonTime,
  getCallDirectionLabel,
  getCallStatusLabel,
  getInitials,
} from "../videoCall.helpers";

describe("features/videoCall helpers", () => {
  it("should format durations under an hour as m:ss", () => {
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(65)).toBe("1:05");
    expect(formatCallDuration(59 * 60 + 59)).toBe("59:59");
  });

  it("should format durations of an hour and more as h:mm:ss", () => {
    expect(formatCallDuration(3600)).toBe("1:00:00");
    expect(formatCallDuration(3600 + 5 * 60 + 7)).toBe("1:05:07");
  });

  it("should show a dash when there is no duration", () => {
    expect(formatCallDuration(null)).toBe("—");
  });

  it("should take up to two uppercase initials", () => {
    expect(getInitials("анна петрова")).toBe("АП");
    expect(getInitials("  Иван  ")).toBe("И");
    expect(getInitials("Анна Мария Петрова")).toBe("АМ");
  });

  it("should label every call status in Russian", () => {
    expect(getCallStatusLabel("COMPLETED", "incoming")).toBe("Завершён");
    expect(getCallStatusLabel("MISSED", "incoming")).toBe("Пропущен");
    expect(getCallStatusLabel("REJECTED", "incoming")).toBe("Отклонён");
    expect(getCallStatusLabel("CANCELED", "incoming")).toBe("Отменён");
    expect(getCallStatusLabel("FAILED", "incoming")).toBe("Не удалось соединиться");
    expect(getCallStatusLabel("COMPLETED", "outgoing")).toBe("Завершён");
  });

  it("should not call an unanswered outgoing call missed (regression: offline tutor shown as missed to the student)", () => {
    expect(getCallStatusLabel("MISSED", "outgoing")).toBe("Без ответа");
  });

  it("should label the call direction", () => {
    expect(getCallDirectionLabel("outgoing")).toBe("Исходящий");
    expect(getCallDirectionLabel("incoming")).toBe("Входящий");
  });

  describe("lesson of a call", () => {
    const lesson = {
      id: "l-1",
      subject: "PHYSICS" as const,
      startTime: "2026-10-22T15:00:00",
      endTime: "2026-10-22T16:00:00",
    };

    it("should name the subject of the lesson", () => {
      expect(formatCallLessonSubject(lesson)).toBe("Физика");
      expect(formatCallLessonSubject({ ...lesson, subject: "MATHEMATICS" })).toBe("Математика");
    });

    it("should show the day and the time range of the lesson", () => {
      expect(formatCallLessonTime(lesson)).toBe("четверг, 22 октября · 15:00—16:00");
    });

    it("should join the subject, the day and the time", () => {
      expect(formatCallLesson(lesson)).toBe("Физика · четверг, 22 октября · 15:00—16:00");
    });
  });
});
