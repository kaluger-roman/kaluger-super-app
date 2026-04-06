import { allSettled, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import { lessonModel } from "@entities";
import { notificationsModel } from "@shared/model";

import "../lessons-notifications.model";

const mockLesson = { id: "1" } as never;

describe("lessons-notifications.model", () => {
  describe("success notifications", () => {
    it("should show 'Урок создан' on addLessonFx.done", async () => {
      const fn = vi.fn();
      const scope = fork({
        handlers: [[lessonModel.addLessonFx, () => mockLesson]],
      });

      notificationsModel.showSuccessEvent.watch(fn);
      await allSettled(lessonModel.addLessonFx, { scope, params: {} as never });

      expect(fn).toHaveBeenCalledWith("Урок создан");
    });

    it("should show 'Урок обновлен' on updateLessonFx.done", async () => {
      const fn = vi.fn();
      const scope = fork({
        handlers: [[lessonModel.updateLessonFx, () => mockLesson]],
      });

      notificationsModel.showSuccessEvent.watch(fn);
      await allSettled(lessonModel.updateLessonFx, {
        scope,
        params: { id: "1", data: {} as never },
      });

      expect(fn).toHaveBeenCalledWith("Урок обновлен");
    });

    it("should show 'Урок удален' on removeLessonFx.done", async () => {
      const fn = vi.fn();
      const scope = fork({
        handlers: [[lessonModel.removeLessonFx, () => "1"]],
      });

      notificationsModel.showSuccessEvent.watch(fn);
      await allSettled(lessonModel.removeLessonFx, {
        scope,
        params: { id: "1" },
      });

      expect(fn).toHaveBeenCalledWith("Урок удален");
    });
  });

  describe("error notifications", () => {
    it("should show error on addLessonFx.fail", async () => {
      const fn = vi.fn();
      const scope = fork({
        handlers: [
          [lessonModel.addLessonFx, () => { throw new Error("test"); }],
        ],
      });

      notificationsModel.showErrorEvent.watch(fn);
      await allSettled(lessonModel.addLessonFx, { scope, params: {} as never });

      expect(fn).toHaveBeenCalledWith("Ошибка при создании урока");
    });

    it("should show error on updateLessonFx.fail", async () => {
      const fn = vi.fn();
      const scope = fork({
        handlers: [
          [lessonModel.updateLessonFx, () => { throw new Error("test"); }],
        ],
      });

      notificationsModel.showErrorEvent.watch(fn);
      await allSettled(lessonModel.updateLessonFx, {
        scope,
        params: { id: "1", data: {} as never },
      });

      expect(fn).toHaveBeenCalledWith("Ошибка при обновлении урока");
    });

    it("should show error on removeLessonFx.fail", async () => {
      const fn = vi.fn();
      const scope = fork({
        handlers: [
          [lessonModel.removeLessonFx, () => { throw new Error("test"); }],
        ],
      });

      notificationsModel.showErrorEvent.watch(fn);
      await allSettled(lessonModel.removeLessonFx, {
        scope,
        params: { id: "1" },
      });

      expect(fn).toHaveBeenCalledWith("Ошибка при удалении урока");
    });
  });
});
