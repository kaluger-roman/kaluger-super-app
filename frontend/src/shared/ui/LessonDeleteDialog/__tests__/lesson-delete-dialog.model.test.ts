import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import type { Lesson } from "../../../types";
import * as lessonDeleteDialogModel from "../lesson-delete-dialog.model";

const createMockLesson = (): Lesson =>
  ({
    id: "1",
    subject: "MATHEMATICS",
    lessonType: "SCHOOL",
    startTime: "2026-01-15T10:00:00.000Z",
    endTime: "2026-01-15T11:30:00.000Z",
    isPaid: false,
    status: "SCHEDULED",
    isRecurring: false,
    studentId: "student1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as Lesson);

describe("lessonDeleteDialogModel", () => {
  describe("lessonDeleteDialogOpened", () => {
    it("should open dialog and set lesson", async () => {
      const scope = fork();
      const mockLesson = createMockLesson();

      await allSettled(lessonDeleteDialogModel.lessonDeleteDialogOpened, {
        scope,
        params: mockLesson,
      });

      expect(scope.getState(lessonDeleteDialogModel.$isOpen)).toBe(true);
      expect(scope.getState(lessonDeleteDialogModel.$lesson)).toEqual(mockLesson);
    });
  });

  describe("lessonDeleteDialogClosed", () => {
    it("should close dialog and reset state", async () => {
      const scope = fork({
        values: [
          [lessonDeleteDialogModel.$isOpen, true],
          [lessonDeleteDialogModel.$lesson, createMockLesson()],
          [lessonDeleteDialogModel.$deleteAllFuture, true],
        ],
      });

      await allSettled(lessonDeleteDialogModel.lessonDeleteDialogClosed, { scope });

      expect(scope.getState(lessonDeleteDialogModel.$isOpen)).toBe(false);
      expect(scope.getState(lessonDeleteDialogModel.$lesson)).toBeUndefined();
      expect(scope.getState(lessonDeleteDialogModel.$deleteAllFuture)).toBe(false);
    });
  });

  describe("deleteAllFutureToggled", () => {
    it("should toggle deleteAllFuture state", async () => {
      const scope = fork();

      await allSettled(lessonDeleteDialogModel.deleteAllFutureToggled, {
        scope,
        params: true,
      });

      expect(scope.getState(lessonDeleteDialogModel.$deleteAllFuture)).toBe(true);

      await allSettled(lessonDeleteDialogModel.deleteAllFutureToggled, {
        scope,
        params: false,
      });

      expect(scope.getState(lessonDeleteDialogModel.$deleteAllFuture)).toBe(false);
    });
  });

  describe("$isLoading", () => {
    it("should have default value false", () => {
      const scope = fork();

      expect(scope.getState(lessonDeleteDialogModel.$isLoading)).toBe(false);
    });
  });
});
