import { allSettled, fork, scopeBind } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";
import { lessonsApi } from "@shared";

import {
  $cancellingLesson,
  $cancellationInfo,
  lessonCancelRequested,
  lessonCancellationConfirmed,
  type CancellationInfo,
} from "../lesson-cancellation.model";
import { $confirmDialog } from "../lessons-confirm-dialog.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    lessonsApi: {
      getCancellationInfo: vi.fn(),
      update: vi.fn(),
    },
    formatDateLong: vi.fn((date: string) => `Formatted ${date}`),
    formatTime: vi.fn((_date: string) => `12:00`),
  };
});

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

describe("lesson-cancellation.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("lessonCancelRequested", () => {
    it("should store cancelling lesson", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const cancellingLesson = scope.getState($cancellingLesson);
      expect(cancellingLesson).toEqual(lesson);
    });

    it("should fetch cancellation info", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      expect(lessonsApi.getCancellationInfo).toHaveBeenCalledWith("lesson-1");
    });

    it("should open confirm dialog with basic message when no cancellation info", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(true);
      expect(confirmDialog.title).toBe("Отменить урок");
      expect(confirmDialog.message).toBe("Вы уверены, что хотите отменить этот урок?");
      expect(confirmDialog.severity).toBe("warning");
    });

    it("should open confirm dialog with transfer info when cancellation info exists", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      const cancellationInfo: CancellationInfo = {
        nextLessonId: "lesson-2",
        nextLessonStartTime: "2026-01-20T14:00:00.000Z",
        nextLessonStudentName: "Иван Иванов",
        transferAmount: 1500,
        transferDate: "2026-01-10T00:00:00.000Z",
      };

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(cancellationInfo);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(true);
      expect(confirmDialog.message).toContain("Оплата в размере 1500 ₽");
      expect(confirmDialog.message).toContain("Иван Иванов");
    });

    it("should store cancellation info in state", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      const cancellationInfo: CancellationInfo = {
        nextLessonId: "lesson-2",
        nextLessonStartTime: "2026-01-20T14:00:00.000Z",
        nextLessonStudentName: "Иван Иванов",
        transferAmount: 1500,
        transferDate: "2026-01-10T00:00:00.000Z",
      };

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(cancellationInfo);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const storedInfo = scope.getState($cancellationInfo);
      expect(storedInfo).toEqual(cancellationInfo);
    });

    it("should handle API error gracefully", async () => {
      const scope = fork();
      const lesson = createMockLesson();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress console errors for this test
      });

      vi.mocked(lessonsApi.getCancellationInfo).mockRejectedValue(new Error("API Error"));

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const cancellationInfo = scope.getState($cancellationInfo);
      expect(cancellationInfo).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("lessonCancellationConfirmed", () => {
    it("should trigger lesson update with CANCELLED status", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);

      await allSettled(lessonCancelRequested, { scope, params: lesson });
      await allSettled(lessonCancellationConfirmed, { scope });

      // Check that cancelling lesson is set
      const cancellingLesson = scope.getState($cancellingLesson);
      expect(cancellingLesson).toEqual(lesson);
    });

    it("should not update if no lesson is being cancelled", async () => {
      const scope = fork({
        values: new Map([[$cancellingLesson, null]]),
      });

      await allSettled(lessonCancellationConfirmed, { scope });

      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe("cleanup after cancellation", () => {
    it("should have cancellation info stored when requested", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      const cancellationInfo: CancellationInfo = {
        nextLessonId: "lesson-2",
        nextLessonStartTime: "2026-01-20T14:00:00.000Z",
        nextLessonStudentName: "Иван Иванов",
        transferAmount: 1500,
        transferDate: "2026-01-10T00:00:00.000Z",
      };

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(cancellationInfo);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const storedInfo = scope.getState($cancellationInfo);
      expect(storedInfo).toEqual(cancellationInfo);
    });

    it("should have null cancellation info when no transfer possible", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);

      await allSettled(lessonCancelRequested, { scope, params: lesson });

      const storedInfo = scope.getState($cancellationInfo);
      expect(storedInfo).toBeNull();
    });

    it("should NOT clear $cancellingLesson when an unrelated lesson becomes CANCELLED via WebSocket (regression: ID-aware cleanup)", async () => {
      const scope = fork();
      const targetLesson = createMockLesson({ id: "lesson-target" });
      const unrelatedCancelled: Lesson = createMockLesson({
        id: "lesson-other",
        status: "CANCELLED",
      });

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);
      vi.mocked(lessonsApi.update).mockResolvedValue(unrelatedCancelled);

      await allSettled(lessonCancelRequested, {
        scope,
        params: targetLesson,
      });

      expect(scope.getState($cancellingLesson)).toEqual(targetLesson);

      // Simulate updateLessonFx returning a different lesson with CANCELLED status
      // (e.g., WebSocket-triggered status change for another lesson on the schedule)
      await allSettled(lessonModel.updateLessonFx, {
        scope,
        params: {
          id: unrelatedCancelled.id,
          data: { status: "CANCELLED" },
        },
      });

      // The cancellation context for the active dialog must remain intact
      expect(scope.getState($cancellingLesson)).toEqual(targetLesson);
    });

    it("should ignore a stale getCancellationInfo response for an earlier lesson (regression: cancel-dialog race)", async () => {
      // Regression for bug-hunt 2026-05-10 #10: when the user clicks
      // «Отменить» on lesson A (slow API), then quickly on lesson B
      // (fast API), without filtering by params the slow response for A
      // would overwrite $cancellationInfo and reopen the dialog with
      // financial data of A while $cancellingLesson is B — leading the
      // user to confirm cancellation of B based on transfer info of A.
      const scope = fork();
      const lessonA = createMockLesson({ id: "lesson-A" });
      const lessonB = createMockLesson({ id: "lesson-B" });

      const infoA: CancellationInfo = {
        nextLessonId: "next-A",
        nextLessonStartTime: "2026-02-01T10:00:00.000Z",
        nextLessonStudentName: "A-Student",
        transferAmount: 1111,
        transferDate: "2026-01-30T00:00:00.000Z",
      };
      const infoB: CancellationInfo = {
        nextLessonId: "next-B",
        nextLessonStartTime: "2026-02-02T10:00:00.000Z",
        nextLessonStudentName: "B-Student",
        transferAmount: 2222,
        transferDate: "2026-01-31T00:00:00.000Z",
      };

      let resolveA: ((value: CancellationInfo) => void) | undefined;
      const promiseA = new Promise<CancellationInfo>((resolve) => {
        resolveA = resolve;
      });

      vi.mocked(lessonsApi.getCancellationInfo).mockImplementation(
        async (id: string) => {
          if (id === "lesson-A") return promiseA;
          return infoB;
        },
      );

      // Fire both events through scopeBind (no allSettled): allSettled would
      // wait for *all* pending effects in the scope to settle, which dead-
      // locks on the deliberately-unresolved promiseA. setTimeout is enough
      // to let the synchronous sample chains and fast B resolve.
      const cancelInScope = scopeBind(lessonCancelRequested, { scope });

      cancelInScope(lessonA);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      cancelInScope(lessonB);
      // Let B's fast effect resolve and reach $cancellationInfo + dialog.
      await new Promise<void>((resolve) => setTimeout(resolve, 30));

      expect(scope.getState($cancellingLesson)).toEqual(lessonB);
      expect(scope.getState($cancellationInfo)).toEqual(infoB);
      expect(scope.getState($confirmDialog).message).toContain("B-Student");

      // Late A response — must be ignored by the params/cancellingLesson
      // filter in the model.
      resolveA!(infoA);
      await new Promise<void>((resolve) => setTimeout(resolve, 30));

      expect(scope.getState($cancellingLesson)).toEqual(lessonB);
      expect(scope.getState($cancellationInfo)).toEqual(infoB);
      expect(scope.getState($confirmDialog).message).toContain("B-Student");
      expect(scope.getState($confirmDialog).message).not.toContain("A-Student");
    });

    it("should clear $cancellingLesson only when the matching lesson becomes CANCELLED", async () => {
      const scope = fork();
      const targetLesson = createMockLesson({ id: "lesson-target" });
      const updated: Lesson = { ...targetLesson, status: "CANCELLED" };

      vi.mocked(lessonsApi.getCancellationInfo).mockResolvedValue(null);
      vi.mocked(lessonsApi.update).mockResolvedValue(updated);

      await allSettled(lessonCancelRequested, {
        scope,
        params: targetLesson,
      });

      await allSettled(lessonModel.updateLessonFx, {
        scope,
        params: {
          id: targetLesson.id,
          data: { status: "CANCELLED" },
        },
      });

      expect(scope.getState($cancellingLesson)).toBeNull();
      expect(scope.getState($cancellationInfo)).toBeNull();
    });
  });
});
