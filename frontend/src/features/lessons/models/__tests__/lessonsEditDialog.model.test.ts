import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import { lessonModel } from "@entities";
import { lessonListLoadHandlers } from "@entities/lesson/testSeams.helpers";
import type { Lesson } from "@shared";

import { $isDialogOpen, dialogOpened } from "../lessonsEditDialog.model";

const createLesson = (id: string): Lesson => ({
  id,
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-10-12T10:00:00.000Z",
  endTime: "2026-10-12T11:00:00.000Z",
  status: "SCHEDULED",
  price: 2000,
  isPaid: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  studentId: "student-1",
});

const createScope = (updated: Lesson) =>
  fork({
    handlers: [...lessonListLoadHandlers(), [lessonModel.updateLessonFx, async () => updated]],
  });

describe("lessonsEditDialog.model", () => {
  it("should close the form after its lesson is updated (regression: form stayed open)", async () => {
    const lesson = createLesson("lesson-1");
    const scope = createScope(lesson);
    await allSettled(dialogOpened, { scope, params: lesson });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: lesson.id, data: { price: 2500 } },
    });

    expect(scope.getState($isDialogOpen)).toBe(false);
  });

  it("should stay open when another lesson is updated", async () => {
    const lesson = createLesson("lesson-1");
    const scope = createScope(createLesson("lesson-2"));
    await allSettled(dialogOpened, { scope, params: lesson });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: "lesson-2", data: { isPaid: true } },
    });

    expect(scope.getState($isDialogOpen)).toBe(true);
  });

  it("should stay open when the update fails", async () => {
    const lesson = createLesson("lesson-1");
    const scope = fork({
      handlers: [
        ...lessonListLoadHandlers(),
        [
          lessonModel.updateLessonFx,
          async () => {
            throw new Error("conflict");
          },
        ],
      ],
    });
    await allSettled(dialogOpened, { scope, params: lesson });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: lesson.id, data: { price: 2500 } },
    });

    expect(scope.getState($isDialogOpen)).toBe(true);
  });
});
