import { allSettled, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import { lessonModel, studentModel } from "@entities";
import type { Student } from "@shared";

import "../commissionReload.model";
import * as viewModeModel from "../lessonsViewMode.model";

const student = (commissionAmount: number): Student => ({
  id: "student-1",
  name: "Иван Иванов",
  commissionAmount,
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS" as const,
  lessonType: "EGE" as const,
  startTime: "2026-03-01T10:00:00.000Z",
  endTime: "2026-03-01T11:00:00.000Z",
  isPaid: true,
  status: "COMPLETED" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  studentId: "student-1",
};

describe("commissionReload.model", () => {
  it("should reload students after a lesson update when a commission student exists", async () => {
    const updateLessonFn = vi.fn(() => Promise.resolve(lesson));
    const loadActiveFn = vi.fn(() => Promise.resolve({ active: [], archived: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.updateLessonFx, updateLessonFn],
        [studentModel.refreshStudentsSilentlyFx, loadActiveFn],
      ],
      values: [[studentModel.$students, [student(3000)]]],
    });

    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: "lesson-1", data: { isPaid: true } },
    });

    expect(loadActiveFn).toHaveBeenCalled();
  });

  it("should not reload students when no student has a commission", async () => {
    const updateLessonFn = vi.fn(() => Promise.resolve(lesson));
    const loadActiveFn = vi.fn(() => Promise.resolve({ active: [], archived: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.updateLessonFx, updateLessonFn],
        [studentModel.refreshStudentsSilentlyFx, loadActiveFn],
      ],
      values: [[studentModel.$students, [student(0)]]],
    });

    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: "lesson-1", data: { isPaid: true } },
    });

    expect(loadActiveFn).not.toHaveBeenCalled();
  });

  it("should reload the weekly list after deleting a lesson for a commission student", async () => {
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
    const loadWeeklyFn = vi.fn(() => Promise.resolve({ lessons: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadWeeklyLessonsFx, loadWeeklyFn],
        [
          studentModel.refreshStudentsSilentlyFx,
          vi.fn(() => Promise.resolve({ active: [], archived: [] })),
        ],
      ],
      values: [
        [studentModel.$students, [student(3000)]],
        [viewModeModel.$lessonsViewMode, "weekly"],
      ],
    });

    await allSettled(lessonModel.removeLesson, { scope, params: { id: "lesson-1" } });

    expect(loadWeeklyFn).toHaveBeenCalled();
  });

  // Regression: lessonsReload already refetches the weekly and schedule lists
  // on an update, so this model must not fire a second request for them.
  it("should not reload the weekly list on a lesson update", async () => {
    const updateLessonFn = vi.fn(() => Promise.resolve(lesson));
    const loadWeeklyFn = vi.fn(() => Promise.resolve({ lessons: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.updateLessonFx, updateLessonFn],
        [lessonModel.loadWeeklyLessonsFx, loadWeeklyFn],
        [
          studentModel.refreshStudentsSilentlyFx,
          vi.fn(() => Promise.resolve({ active: [], archived: [] })),
        ],
      ],
      values: [
        [studentModel.$students, [student(3000)]],
        [viewModeModel.$lessonsViewMode, "weekly"],
      ],
    });

    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: "lesson-1", data: { isPaid: true } },
    });

    expect(loadWeeklyFn).not.toHaveBeenCalled();
  });

  it("should not reload the weekly list without commission students", async () => {
    const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
    const loadWeeklyFn = vi.fn(() => Promise.resolve({ lessons: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.removeLessonFx, removeLessonFn],
        [lessonModel.loadWeeklyLessonsFx, loadWeeklyFn],
      ],
      values: [
        [studentModel.$students, [student(0)]],
        [viewModeModel.$lessonsViewMode, "weekly"],
      ],
    });

    await allSettled(lessonModel.removeLesson, { scope, params: { id: "lesson-1" } });

    expect(loadWeeklyFn).not.toHaveBeenCalled();
  });

  it("should reload the schedule list after adding a lesson for a commission student", async () => {
    const addLessonFn = vi.fn(() => Promise.resolve(lesson));
    const loadScheduleFn = vi.fn(() => Promise.resolve({ lessons: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.addLessonFx, addLessonFn],
        [lessonModel.loadScheduleLessonsFx, loadScheduleFn],
        [
          studentModel.refreshStudentsSilentlyFx,
          vi.fn(() => Promise.resolve({ active: [], archived: [] })),
        ],
        [lessonModel.loadUpcomingLessonsFx, vi.fn(() => Promise.resolve({ lessons: [] }))],
      ],
      values: [
        [studentModel.$students, [student(3000)]],
        [viewModeModel.$lessonsViewMode, "schedule"],
      ],
    });

    await allSettled(lessonModel.addLesson, {
      scope,
      params: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      },
    });

    expect(loadScheduleFn).toHaveBeenCalled();
  });

  it("should count an archived commission student as well", async () => {
    const updateLessonFn = vi.fn(() => Promise.resolve(lesson));
    const loadActiveFn = vi.fn(() => Promise.resolve({ active: [], archived: [] }));
    const scope = fork({
      handlers: [
        [lessonModel.updateLessonFx, updateLessonFn],
        [studentModel.refreshStudentsSilentlyFx, loadActiveFn],
      ],
      values: [
        [studentModel.$students, [student(0)]],
        [studentModel.$archivedStudents, [{ ...student(2000), archived: true }]],
      ],
    });

    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: "lesson-1", data: { isPaid: true } },
    });

    expect(loadActiveFn).toHaveBeenCalled();
  });
});
