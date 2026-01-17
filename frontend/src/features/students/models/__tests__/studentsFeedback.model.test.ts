import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { studentModel, lessonModel } from "@entities";
import { lessonsModel } from "@features/lessons";
import type { Student } from "@shared";
import { notificationsModel } from "@shared/model";

import "../studentsFeedback.model";

const mockStudent: Student = {
  id: "student-1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

describe("studentsFeedback.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {
      //
    });
  });

  describe("addStudentFx success", () => {
    it("should show success notification with correct message", async () => {
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.resolve(mockStudent))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ученик добавлен",
        type: "success",
      });
    });
  });

  describe("updateStudentFx success", () => {
    it("should show success notification with correct message", async () => {
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.resolve(mockStudent))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ученик обновлен",
        type: "success",
      });
    });
  });

  describe("removeStudentFx success", () => {
    it("should reload upcoming lessons with filter values", async () => {
      const loadUpcomingLessonsFn = vi.fn(() => Promise.resolve([]));
      const scope = fork({
        values: [
          [lessonsModel.$onlyUnpaid, true],
          [lessonsModel.$onlyWithoutHomework, false],
        ],
        handlers: [
          [lessonModel.loadUpcomingLessonsFx, loadUpcomingLessonsFn],
          [studentModel.removeStudentFx, vi.fn(() => Promise.resolve())],
        ],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      expect(loadUpcomingLessonsFn).toHaveBeenCalledWith({
        onlyUnpaid: true,
        onlyWithoutHomework: false,
      });
    });

    it("should reload upcoming lessons with both filters disabled", async () => {
      const loadUpcomingLessonsFn = vi.fn(() => Promise.resolve([]));
      const scope = fork({
        values: [
          [lessonsModel.$onlyUnpaid, false],
          [lessonsModel.$onlyWithoutHomework, false],
        ],
        handlers: [
          [lessonModel.loadUpcomingLessonsFx, loadUpcomingLessonsFn],
          [studentModel.removeStudentFx, vi.fn(() => Promise.resolve())],
        ],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      expect(loadUpcomingLessonsFn).toHaveBeenCalledWith({
        onlyUnpaid: false,
        onlyWithoutHomework: false,
      });
    });

    it("should reload upcoming lessons with both filters enabled", async () => {
      const loadUpcomingLessonsFn = vi.fn(() => Promise.resolve([]));
      const scope = fork({
        values: [
          [lessonsModel.$onlyUnpaid, true],
          [lessonsModel.$onlyWithoutHomework, true],
        ],
        handlers: [
          [lessonModel.loadUpcomingLessonsFx, loadUpcomingLessonsFn],
          [studentModel.removeStudentFx, vi.fn(() => Promise.resolve())],
        ],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      expect(loadUpcomingLessonsFn).toHaveBeenCalledWith({
        onlyUnpaid: true,
        onlyWithoutHomework: true,
      });
    });

    it("should show success notification with correct message", async () => {
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.resolve())]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ученик удален",
        type: "success",
      });
    });
  });

  describe("addStudentFx error", () => {
    it("should show error notification with message from response", async () => {
      const errorResponse = {
        response: {
          data: {
            error: "Студент с таким телефоном уже существует",
          },
        },
      };
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Студент с таким телефоном уже существует",
        type: "error",
      });
    });

    it("should show default error message when no error in response", async () => {
      const errorResponse = { response: { data: {} } };
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при добавлении студента",
        type: "error",
      });
    });

    it("should show default error message when response is undefined", async () => {
      const errorResponse = {};
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при добавлении студента",
        type: "error",
      });
    });

    it("should show default error message when error is string", async () => {
      const errorResponse = "Network error";
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при добавлении студента",
        type: "error",
      });
    });

    it("should show default error message when error is null", async () => {
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(null))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при добавлении студента",
        type: "error",
      });
    });

    it("should show default error message when response.data is null", async () => {
      const errorResponse = { response: { data: null } };
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при добавлении студента",
        type: "error",
      });
    });

    it("should log error to console", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      const errorResponse = { response: { data: { error: "Test error" } } };
      const scope = fork({
        handlers: [[studentModel.addStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.addStudentFx, {
        scope,
        params: {
          name: "Иван Иванов",
          phone: "+79991234567",
          contactMethod: "WHATSAPP",
        },
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Add student error:", errorResponse);
    });
  });

  describe("updateStudentFx error", () => {
    it("should show error notification with message from response", async () => {
      const errorResponse = {
        response: {
          data: {
            error: "Студент не найден",
          },
        },
      };
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Студент не найден",
        type: "error",
      });
    });

    it("should show default error message when no error in response", async () => {
      const errorResponse = { response: { data: {} } };
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при обновлении студента",
        type: "error",
      });
    });

    it("should show default error message when response is undefined", async () => {
      const errorResponse = {};
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при обновлении студента",
        type: "error",
      });
    });

    it("should show default error message when error is string", async () => {
      const errorResponse = "Network error";
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при обновлении студента",
        type: "error",
      });
    });

    it("should show default error message when error is null", async () => {
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(null))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при обновлении студента",
        type: "error",
      });
    });

    it("should show default error message when response.data is null", async () => {
      const errorResponse = { response: { data: null } };
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при обновлении студента",
        type: "error",
      });
    });

    it("should log error to console", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      const errorResponse = { response: { data: { error: "Test error" } } };
      const scope = fork({
        handlers: [[studentModel.updateStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.updateStudentFx, {
        scope,
        params: {
          id: "student-1",
          data: { name: "Иван Петров" },
        },
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Update student error:", errorResponse);
    });
  });

  describe("removeStudentFx error", () => {
    it("should show error notification with message from response", async () => {
      const errorResponse = {
        response: {
          data: {
            error: "Невозможно удалить студента с запланированными уроками",
          },
        },
      };
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Невозможно удалить студента с запланированными уроками",
        type: "error",
      });
    });

    it("should show default error message when no error in response", async () => {
      const errorResponse = { response: { data: {} } };
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при удалении студента",
        type: "error",
      });
    });

    it("should show default error message when response is undefined", async () => {
      const errorResponse = {};
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при удалении студента",
        type: "error",
      });
    });

    it("should show default error message when error is string", async () => {
      const errorResponse = "Network error";
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при удалении студента",
        type: "error",
      });
    });

    it("should show default error message when error is null", async () => {
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(null))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при удалении студента",
        type: "error",
      });
    });

    it("should show default error message when response.data is null", async () => {
      const errorResponse = { response: { data: null } };
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      const notification = scope.getState(notificationsModel.$notification);
      expect(notification).toMatchObject({
        message: "Ошибка при удалении студента",
        type: "error",
      });
    });

    it("should log error to console", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      const errorResponse = { response: { data: { error: "Test error" } } };
      const scope = fork({
        handlers: [[studentModel.removeStudentFx, vi.fn(() => Promise.reject(errorResponse))]],
      });

      await allSettled(studentModel.removeStudentFx, {
        scope,
        params: "student-1",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Remove student error:", errorResponse);
    });
  });
});
