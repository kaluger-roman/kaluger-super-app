import { describe, expect, it } from "vitest";

import type { StudentVisibleLesson } from "@shared";

import {
  findOpenedLesson,
  isCallOfOpenedLesson,
  isStartCall,
  toStudentLessonCall,
} from "../studentLessonDialog.helpers";

const lesson: StudentVisibleLesson = {
  id: "l-1",
  subject: "PHYSICS",
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
  status: "CANCELLED",
};

describe("features/studentSchedule/models/studentLessonDialog.helpers", () => {
  it("should find the opened lesson among the shown ones", () => {
    expect(findOpenedLesson([lesson], "l-1")).toEqual(lesson);
    expect(findOpenedLesson([lesson], "l-2")).toBeNull();
    expect(findOpenedLesson([lesson], null)).toBeNull();
  });

  it("should build a call to the tutor about the lesson", () => {
    expect(toStudentLessonCall({ lesson, tutorName: "Анна Кузнецова" })).toEqual({
      peerName: "Анна Кузнецова",
      lesson: {
        id: "l-1",
        subject: "PHYSICS",
        startTime: "2026-10-23T15:00:00.000Z",
        endTime: "2026-10-23T16:00:00.000Z",
      },
    });
  });

  it("should build no call without a lesson or without a tutor", () => {
    expect(toStudentLessonCall({ lesson: null, tutorName: "Анна" })).toBeNull();
    expect(toStudentLessonCall({ lesson, tutorName: null })).toBeNull();
    expect(isStartCall(null)).toBe(false);
  });

  it("should match a confirmed call to the opened lesson", () => {
    const call = toStudentLessonCall({ lesson, tutorName: "Анна" });
    if (!isStartCall(call)) throw new Error("no call");

    expect(isCallOfOpenedLesson("l-1", call)).toBe(true);
    expect(isCallOfOpenedLesson("l-2", call)).toBe(false);
    expect(isCallOfOpenedLesson(null, call)).toBe(false);
    expect(isCallOfOpenedLesson("l-1", { studentId: "s-1", peerName: "Иван", lesson: null })).toBe(
      false
    );
  });
});
