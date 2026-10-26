import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import type { Lesson } from "@shared";

import { callConfirmModel, callModel } from "../../../videoCall";
import type { StartCallParams } from "../../../videoCall";
import * as lessonCallModel from "../lessonCall.model";
import * as lessonsViewDialogModel from "../lessonsViewDialog.model";

const student = {
  id: "student-1",
  name: "Иван Петров",
  archived: true,
  studentUser: { id: "su-1" },
};

const lesson: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "SCHOOL",
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
  isPaid: false,
  status: "COMPLETED",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  studentId: "student-1",
  student,
};

const CALL_LESSON = {
  id: "lesson-1",
  subject: "MATHEMATICS" as const,
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
};

const LESSON_CALL: StartCallParams = {
  studentId: "student-1",
  peerName: "Иван Петров",
  lesson: CALL_LESSON,
};

const openLesson = async (viewing: Lesson = lesson) => {
  const scope = fork();
  const started: StartCallParams[] = [];
  createWatch({ unit: callModel.callStarted, fn: (call) => started.push(call), scope });
  await allSettled(lessonsViewDialogModel.viewDialogOpened, { scope, params: viewing });
  return { scope, started };
};

describe("features/lessons/models/lessonCall.model", () => {
  it("should ask to confirm a call to the student of the lesson", async () => {
    const { scope, started } = await openLesson();

    await allSettled(lessonCallModel.lessonCallRequested, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(true);
    expect(scope.getState(callConfirmModel.$call)).toEqual(LESSON_CALL);
    expect(started).toEqual([]);
  });

  it("should not ask anything for a student without a cabinet", async () => {
    const { scope } = await openLesson({
      ...lesson,
      student: { ...student, studentUser: null },
    });

    await allSettled(lessonCallModel.lessonCallRequested, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
  });

  it("should close the lesson and start the call once confirmed", async () => {
    const { scope, started } = await openLesson();

    await allSettled(lessonCallModel.lessonCallRequested, { scope });
    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(started).toEqual([LESSON_CALL]);
    expect(scope.getState(lessonsViewDialogModel.$isViewDialogOpen)).toBe(false);
  });

  it("should keep the lesson open when the confirmation is dismissed", async () => {
    const { scope, started } = await openLesson();

    await allSettled(lessonCallModel.lessonCallRequested, { scope });
    await allSettled(callConfirmModel.confirmDismissed, { scope });

    expect(started).toEqual([]);
    expect(scope.getState(lessonsViewDialogModel.$isViewDialogOpen)).toBe(true);
  });

  it("should keep the lesson open when a call of another lesson or of the student card is confirmed", async () => {
    const { scope } = await openLesson();

    await allSettled(callConfirmModel.callRequested, {
      scope,
      params: { ...LESSON_CALL, lesson: { ...CALL_LESSON, id: "lesson-2" } },
    });
    await allSettled(callConfirmModel.callConfirmed, { scope });
    expect(scope.getState(lessonsViewDialogModel.$isViewDialogOpen)).toBe(true);

    await allSettled(callConfirmModel.callRequested, {
      scope,
      params: { studentId: "student-1", peerName: "Иван Петров", lesson: null },
    });
    await allSettled(callConfirmModel.callConfirmed, { scope });
    expect(scope.getState(lessonsViewDialogModel.$isViewDialogOpen)).toBe(true);
  });
});
