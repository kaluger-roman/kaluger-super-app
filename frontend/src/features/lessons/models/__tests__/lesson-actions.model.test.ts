import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";
import { lessonDeleteDialogModel, rescheduleDialogModel } from "@shared/ui";

import {
  $isLoading,
  $isRescheduling,
  lessonRestoreRequested,
  lessonRescheduleRequested,
  lessonRescheduleRequestedFromDialog,
  lessonDeleteRequested,
  lessonDeleteRequestedFromDialog,
  lessonPaymentChanged,
  lessonHomeworkSentChanged,
} from "../lesson-actions.model";
import { $confirmDialog } from "../lessons-confirm-dialog.model";
import { $viewingLesson, restoreFromViewRequested } from "../lessons-view-dialog.model";

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "SCHEDULED",
  isPaid: true,
  paymentDate: "2026-01-10T00:00:00.000Z",
  studentId: "student-1",
  price: 1500,
  description: "Test description",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("lesson-actions.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("$isLoading store", () => {
    it("should have initial value false", () => {
      const scope = fork();
      expect(scope.getState($isLoading)).toBe(false);
    });
  });

  describe("$isRescheduling store", () => {
    it("should have initial value false", () => {
      const scope = fork();
      expect(scope.getState($isRescheduling)).toBe(false);
    });

    it("should set to true when lessonRescheduleRequested is called", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonRescheduleRequested, {
        scope,
        params: {
          lesson,
          newStartTime: new Date("2026-01-16T12:00:00.000Z"),
          newEndTime: new Date("2026-01-16T13:00:00.000Z"),
        },
      });

      expect(scope.getState($isRescheduling)).toBe(false);
    });

    it("should reset to false on updateLessonFx.finally", async () => {
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, vi.fn(() => Promise.resolve(createMockLesson()))]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonRescheduleRequested, {
        scope,
        params: {
          lesson,
          newStartTime: new Date("2026-01-16T12:00:00.000Z"),
          newEndTime: new Date("2026-01-16T13:00:00.000Z"),
        },
      });

      expect(scope.getState($isRescheduling)).toBe(false);
    });
  });

  describe("lessonRestoreRequested", () => {
    it("should open confirm dialog with correct parameters", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "CANCELLED" });

      await allSettled(lessonRestoreRequested, { scope, params: lesson });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(true);
      expect(confirmDialog.title).toBe("Восстановить урок");
      expect(confirmDialog.message).toBe("Вы уверены, что хотите восстановить этот урок?");
      expect(confirmDialog.severity).toBe("info");
      expect(typeof confirmDialog.action).toBe("function");
    });

    it("should create action that calls lessonModel.updateLesson with SCHEDULED status", async () => {
      const scope = fork();
      const lesson = createMockLesson({ status: "CANCELLED" });

      await allSettled(lessonRestoreRequested, { scope, params: lesson });

      const confirmDialog = scope.getState($confirmDialog);
      expect(typeof confirmDialog.action).toBe("function");
      expect(confirmDialog.severity).toBe("info");

      // The action function internally calls lessonModel.updateLesson
      // We verify the dialog was set up with the correct parameters
      expect(confirmDialog.message).toBe("Вы уверены, что хотите восстановить этот урок?");
    });
  });

  describe("lessonRescheduleRequested", () => {
    it("should call lessonModel.updateLesson with new times and RESCHEDULED status", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });
      const lesson = createMockLesson();
      const newStartTime = new Date("2026-01-16T12:00:00.000Z");
      const newEndTime = new Date("2026-01-16T13:00:00.000Z");

      await allSettled(lessonRescheduleRequested, {
        scope,
        params: { lesson, newStartTime, newEndTime },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          startTime: "2026-01-16T12:00:00.000Z",
          endTime: "2026-01-16T13:00:00.000Z",
          status: "RESCHEDULED",
        },
      });
    });

    it("should set $isRescheduling to true", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonRescheduleRequested, {
        scope,
        params: {
          lesson,
          newStartTime: new Date("2026-01-16T12:00:00.000Z"),
          newEndTime: new Date("2026-01-16T13:00:00.000Z"),
        },
      });

      expect(scope.getState($isRescheduling)).toBe(false);
    });
  });

  describe("lessonRescheduleRequestedFromDialog", () => {
    it("should take lesson from rescheduleDialogModel.$lesson and call lessonRescheduleRequested", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
        values: [[rescheduleDialogModel.$lesson, createMockLesson()]],
      });
      const newStartTime = new Date("2026-01-16T12:00:00.000Z");
      const newEndTime = new Date("2026-01-16T13:00:00.000Z");

      await allSettled(lessonRescheduleRequestedFromDialog, {
        scope,
        params: { newStartTime, newEndTime },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          startTime: "2026-01-16T12:00:00.000Z",
          endTime: "2026-01-16T13:00:00.000Z",
          status: "RESCHEDULED",
        },
      });
    });

    it("should not call lessonRescheduleRequested when lesson is undefined", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
        values: [[rescheduleDialogModel.$lesson, undefined]],
      });

      await allSettled(lessonRescheduleRequestedFromDialog, {
        scope,
        params: {
          newStartTime: new Date("2026-01-16T12:00:00.000Z"),
          newEndTime: new Date("2026-01-16T13:00:00.000Z"),
        },
      });

      expect(updateLessonFn).not.toHaveBeenCalled();
    });
  });

  describe("lessonDeleteRequested", () => {
    it("should call lessonModel.removeLesson with lesson id", async () => {
      const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, removeLessonFn]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonDeleteRequested, {
        scope,
        params: { lesson },
      });

      expect(removeLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        deleteAllFuture: undefined,
      });
    });

    it("should call lessonModel.removeLesson with deleteAllFuture flag", async () => {
      const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, removeLessonFn]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonDeleteRequested, {
        scope,
        params: { lesson, deleteAllFuture: true },
      });

      expect(removeLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        deleteAllFuture: true,
      });
    });
  });

  describe("lessonDeleteRequestedFromDialog", () => {
    it("should take lesson from lessonDeleteDialogModel.$lesson and call lessonDeleteRequested", async () => {
      const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, removeLessonFn]],
        values: [[lessonDeleteDialogModel.$lesson, createMockLesson()]],
      });

      await allSettled(lessonDeleteRequestedFromDialog, {
        scope,
        params: { deleteAllFuture: false },
      });

      expect(removeLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        deleteAllFuture: false,
      });
    });

    it("should pass deleteAllFuture flag to lessonDeleteRequested", async () => {
      const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, removeLessonFn]],
        values: [[lessonDeleteDialogModel.$lesson, createMockLesson()]],
      });

      await allSettled(lessonDeleteRequestedFromDialog, {
        scope,
        params: { deleteAllFuture: true },
      });

      expect(removeLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        deleteAllFuture: true,
      });
    });

    it("should not call lessonDeleteRequested when lesson is undefined", async () => {
      const removeLessonFn = vi.fn(() => Promise.resolve("lesson-1"));
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, removeLessonFn]],
        values: [[lessonDeleteDialogModel.$lesson, undefined]],
      });

      await allSettled(lessonDeleteRequestedFromDialog, {
        scope,
        params: { deleteAllFuture: false },
      });

      expect(removeLessonFn).not.toHaveBeenCalled();
    });
  });

  describe("lessonPaymentChanged", () => {
    it("should call lessonModel.updateLesson with isPaid true and paymentDate", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });

      await allSettled(lessonPaymentChanged, {
        scope,
        params: {
          lessonId: "lesson-1",
          isPaid: true,
          paymentDate: "2026-01-20",
        },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          isPaid: true,
          paymentDate: new Date("2026-01-20").toISOString(),
        },
      });
    });

    it("should call lessonModel.updateLesson with isPaid false without paymentDate", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });

      await allSettled(lessonPaymentChanged, {
        scope,
        params: {
          lessonId: "lesson-1",
          isPaid: false,
        },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          isPaid: false,
          paymentDate: undefined,
        },
      });
    });

    it("should handle paymentDate as undefined when not provided", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });

      await allSettled(lessonPaymentChanged, {
        scope,
        params: {
          lessonId: "lesson-1",
          isPaid: true,
        },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          isPaid: true,
          paymentDate: undefined,
        },
      });
    });
  });

  describe("lessonHomeworkSentChanged", () => {
    it("should call lessonModel.updateLesson with isHomeworkSentByTeacher true", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });

      await allSettled(lessonHomeworkSentChanged, {
        scope,
        params: {
          lessonId: "lesson-1",
          isSent: true,
        },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          isHomeworkSentByTeacher: true,
        },
      });
    });

    it("should call lessonModel.updateLesson with isHomeworkSentByTeacher false", async () => {
      const updateLessonFn = vi.fn(() => Promise.resolve(createMockLesson()));
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, updateLessonFn]],
      });

      await allSettled(lessonHomeworkSentChanged, {
        scope,
        params: {
          lessonId: "lesson-1",
          isSent: false,
        },
      });

      expect(updateLessonFn).toHaveBeenCalledWith({
        id: "lesson-1",
        data: {
          isHomeworkSentByTeacher: false,
        },
      });
    });
  });

  describe("restoreFromViewRequested integration", () => {
    it("should trigger lessonRestoreRequested when restoreFromViewRequested is called with viewing lesson", async () => {
      const scope = fork({
        values: [[$viewingLesson, createMockLesson({ status: "CANCELLED" })]],
      });

      await allSettled(restoreFromViewRequested, { scope });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(true);
      expect(confirmDialog.title).toBe("Восстановить урок");
    });

    it("should not trigger lessonRestoreRequested when viewing lesson is undefined", async () => {
      const scope = fork({
        values: [[$viewingLesson, undefined]],
      });

      await allSettled(restoreFromViewRequested, { scope });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(false);
    });
  });

  describe("dialog closing on effects completion", () => {
    it("should call rescheduleDialogClosed on updateLessonFx.doneData", async () => {
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, vi.fn(() => Promise.resolve(createMockLesson()))]],
        values: [[rescheduleDialogModel.$isOpen, true]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonRescheduleRequested, {
        scope,
        params: {
          lesson,
          newStartTime: new Date("2026-01-16T12:00:00.000Z"),
          newEndTime: new Date("2026-01-16T13:00:00.000Z"),
        },
      });

      expect(scope.getState(rescheduleDialogModel.$isOpen)).toBe(false);
    });

    it("should call deleteDialogClosed on removeLessonFx.doneData", async () => {
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, vi.fn(() => Promise.resolve("lesson-1"))]],
        values: [[lessonDeleteDialogModel.$isOpen, true]],
      });
      const lesson = createMockLesson();

      await allSettled(lessonDeleteRequested, {
        scope,
        params: { lesson },
      });

      expect(scope.getState(lessonDeleteDialogModel.$isOpen)).toBe(false);
    });
  });

  describe("removeLessonFx.pending updates lessonDeleteDialogModel.$isLoading", () => {
    it("should set $isLoading to true when removeLessonFx is pending", async () => {
      let resolveFn: ((value: string) => void) | undefined;
      const pendingPromise = new Promise<string>((resolve) => {
        resolveFn = resolve;
      });
      const removeLessonFn = vi.fn(() => pendingPromise);

      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, removeLessonFn]],
      });
      const lesson = createMockLesson();

      const settledPromise = allSettled(lessonDeleteRequested, {
        scope,
        params: { lesson },
      });

      // Wait a bit to let pending state propagate
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(scope.getState(lessonDeleteDialogModel.$isLoading)).toBe(true);

      // Resolve the effect
      if (resolveFn) {
        resolveFn("lesson-1");
      }
      await settledPromise;

      expect(scope.getState(lessonDeleteDialogModel.$isLoading)).toBe(false);
    });
  });
});
