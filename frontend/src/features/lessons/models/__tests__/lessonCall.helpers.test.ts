import { describe, expect, it } from "vitest";

import type { Lesson } from "@shared";

import {
  hasCallableStudent,
  isCallOfLesson,
  isStartCall,
  toCallLesson,
  toLessonCall,
} from "../lessonCall.helpers";

const student = {
  id: "student-1",
  name: "Иван Петров",
  archived: false,
  studentUser: { id: "su-1" },
};

const lesson: Lesson = {
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
  isPaid: false,
  status: "SCHEDULED",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  studentId: "student-1",
  student,
};

const SUMMARY = {
  id: "lesson-1",
  subject: "PHYSICS" as const,
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
};

describe("features/lessons/models/lessonCall.helpers", () => {
  it("should summarize the lesson for the call", () => {
    expect(toCallLesson(lesson)).toEqual(SUMMARY);
  });

  it("should allow a call only to a student with a cabinet", () => {
    expect(hasCallableStudent(lesson)).toBe(true);
    expect(hasCallableStudent({ ...lesson, student: { ...student, studentUser: null } })).toBe(
      false
    );
    expect(hasCallableStudent({ ...lesson, studentId: null, student: undefined })).toBe(false);
  });

  it("should allow a call to an archived student with a cabinet", () => {
    expect(hasCallableStudent({ ...lesson, student: { ...student, archived: true } })).toBe(true);
  });

  it("should build the lesson call to the student", () => {
    expect(toLessonCall(lesson)).toEqual({
      studentId: "student-1",
      peerName: "Иван Петров",
      lesson: SUMMARY,
    });
  });

  it("should build no call without a cabinet, for a trial lesson or without a lesson", () => {
    expect(toLessonCall({ ...lesson, student: { ...student, studentUser: null } })).toBeNull();
    expect(
      toLessonCall({ ...lesson, studentId: null, student: undefined, prospectName: "Пробный" })
    ).toBeNull();
    expect(toLessonCall(undefined)).toBeNull();
  });

  it("should tell a built call from none", () => {
    expect(isStartCall(toLessonCall(lesson))).toBe(true);
    expect(isStartCall(null)).toBe(false);
  });

  it("should match a call to its lesson only", () => {
    const call = { studentId: "student-1", peerName: "Иван", lesson: SUMMARY };
    expect(isCallOfLesson(lesson, call)).toBe(true);
    expect(isCallOfLesson({ ...lesson, id: "lesson-2" }, call)).toBe(false);
    expect(isCallOfLesson(lesson, { ...call, lesson: null })).toBe(false);
    expect(isCallOfLesson(undefined, call)).toBe(false);
  });
});
