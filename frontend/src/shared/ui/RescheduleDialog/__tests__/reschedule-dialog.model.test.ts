import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import type { Lesson } from "../../../types";
import * as rescheduleDialogModel from "../reschedule-dialog.model";

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

describe("rescheduleDialogModel", () => {
  describe("rescheduleDialogOpened", () => {
    it("should open dialog and set lesson with times", async () => {
      const scope = fork();
      const mockLesson = createMockLesson();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      expect(scope.getState(rescheduleDialogModel.$isOpen)).toBe(true);
      expect(scope.getState(rescheduleDialogModel.$lesson)).toEqual(mockLesson);
      expect(scope.getState(rescheduleDialogModel.$newStartTime)).toEqual(
        new Date(mockLesson.startTime)
      );
      expect(scope.getState(rescheduleDialogModel.$newEndTime)).toEqual(
        new Date(mockLesson.endTime)
      );
    });
  });

  describe("rescheduleDialogClosed", () => {
    it("should close dialog and reset all state", async () => {
      const scope = fork({
        values: [
          [rescheduleDialogModel.$isOpen, true],
          [rescheduleDialogModel.$lesson, createMockLesson()],
          [rescheduleDialogModel.$newStartTime, new Date()],
          [rescheduleDialogModel.$newEndTime, new Date()],
        ],
      });

      await allSettled(rescheduleDialogModel.rescheduleDialogClosed, { scope });

      expect(scope.getState(rescheduleDialogModel.$isOpen)).toBe(false);
      expect(scope.getState(rescheduleDialogModel.$lesson)).toBeUndefined();
      expect(scope.getState(rescheduleDialogModel.$newStartTime)).toBeUndefined();
      expect(scope.getState(rescheduleDialogModel.$newEndTime)).toBeUndefined();
    });
  });

  describe("newStartTimeChanged", () => {
    it("should update start time and adjust end time to maintain duration", async () => {
      const scope = fork();
      const mockLesson = createMockLesson();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      const newStartTime = new Date("2026-01-15T14:00:00.000Z");

      await allSettled(rescheduleDialogModel.newStartTimeChanged, {
        scope,
        params: newStartTime,
      });

      expect(scope.getState(rescheduleDialogModel.$newStartTime)).toEqual(newStartTime);

      const newEndTime = scope.getState(rescheduleDialogModel.$newEndTime);
      expect(newEndTime).toBeDefined();

      // Duration should be maintained (90 minutes)
      const duration = (newEndTime as Date).getTime() - newStartTime.getTime();
      expect(duration).toBe(90 * 60 * 1000);
    });

    it("should not adjust end time when lesson is undefined", async () => {
      const scope = fork({
        values: [
          [rescheduleDialogModel.$lesson, undefined],
          [rescheduleDialogModel.$newEndTime, new Date("2026-01-15T11:30:00.000Z")],
        ],
      });

      const originalEndTime = scope.getState(rescheduleDialogModel.$newEndTime);
      const newStartTime = new Date("2026-01-15T14:00:00.000Z");

      await allSettled(rescheduleDialogModel.newStartTimeChanged, {
        scope,
        params: newStartTime,
      });

      expect(scope.getState(rescheduleDialogModel.$newStartTime)).toEqual(newStartTime);
      expect(scope.getState(rescheduleDialogModel.$newEndTime)).toEqual(originalEndTime);
    });

    it("should handle case when newStartTime becomes undefined", async () => {
      const scope = fork({
        values: [
          [rescheduleDialogModel.$lesson, createMockLesson()],
          [rescheduleDialogModel.$newStartTime, undefined],
        ],
      });

      const newStartTime = new Date("2026-01-15T14:00:00.000Z");

      await allSettled(rescheduleDialogModel.newStartTimeChanged, {
        scope,
        params: newStartTime,
      });

      expect(scope.getState(rescheduleDialogModel.$newStartTime)).toEqual(newStartTime);
    });
  });

  describe("newEndTimeChanged", () => {
    it("should update end time", async () => {
      const scope = fork();
      const mockLesson = createMockLesson();

      await allSettled(rescheduleDialogModel.rescheduleDialogOpened, {
        scope,
        params: mockLesson,
      });

      const newEndTime = new Date("2026-01-15T13:00:00.000Z");

      await allSettled(rescheduleDialogModel.newEndTimeChanged, {
        scope,
        params: newEndTime,
      });

      expect(scope.getState(rescheduleDialogModel.$newEndTime)).toEqual(newEndTime);
    });
  });
});
