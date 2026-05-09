import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonModel } from "@entities";
import type { Lesson } from "@shared";

import {
  $isViewDialogOpen,
  $viewingLesson,
  viewDialogOpened,
} from "../lessons-view-dialog.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    lessonsApi: {
      update: vi.fn(),
      remove: vi.fn(),
    },
  };
});

const createLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "SCHEDULED",
  isPaid: false,
  studentId: "student-1",
  price: 1500,
  description: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("lessons-view-dialog.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should keep dialog open when updateLessonFx finishes for the viewed lesson (regression: auto-close on toggles)", async () => {
    // Regression for bug-hunt 2026-05-09-3 #5: clicking PaymentStatus or
    // HomeworkSentStatus toggles inside the view dialog triggered
    // updateLessonFx.doneData, which previously closed the dialog itself.
    const lesson = createLesson({ isPaid: false });
    const updated = { ...lesson, isPaid: true };

    const scope = fork({
      handlers: [[lessonModel.updateLessonFx, async () => updated]],
    });

    await allSettled(viewDialogOpened, { scope, params: lesson });
    expect(scope.getState($isViewDialogOpen)).toBe(true);

    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: lesson.id, data: { isPaid: true } },
    });

    expect(scope.getState($isViewDialogOpen)).toBe(true);
    expect(scope.getState($viewingLesson)).toEqual(updated);
  });

  it("should sync $viewingLesson with the latest data after update", async () => {
    const lesson = createLesson({ description: "old" });
    const updated = { ...lesson, description: "new" };

    const scope = fork({
      handlers: [[lessonModel.updateLessonFx, async () => updated]],
    });

    await allSettled(viewDialogOpened, { scope, params: lesson });
    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: lesson.id, data: { description: "new" } },
    });

    expect(scope.getState($viewingLesson)).toEqual(updated);
  });

  it("should ignore updates targeting a different lesson", async () => {
    const lesson = createLesson({ id: "lesson-1" });
    const otherUpdated = createLesson({ id: "other-lesson", description: "x" });

    const scope = fork({
      handlers: [[lessonModel.updateLessonFx, async () => otherUpdated]],
    });

    await allSettled(viewDialogOpened, { scope, params: lesson });
    await allSettled(lessonModel.updateLesson, {
      scope,
      params: { id: "other-lesson", data: { description: "x" } },
    });

    expect(scope.getState($isViewDialogOpen)).toBe(true);
    expect(scope.getState($viewingLesson)).toEqual(lesson);
  });
});
