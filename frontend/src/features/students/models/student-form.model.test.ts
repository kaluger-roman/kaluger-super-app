import { allSettled, fork } from "effector";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { studentModel } from "@entities";
import type { CreateStudentDto, Student, UpdateStudentDto } from "@shared";
import { notificationsModel } from "@shared/model";

import * as studentFormModel from "./student-form.model";

const mockStudent: Student = {
  id: "student-1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("student-form.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation on submit", () => {
    it("should show an error notification and not create a student when the name is empty", async () => {
      const addStudentFn = vi.fn((_data: CreateStudentDto) => Promise.resolve(mockStudent));
      const scope = fork({ handlers: [[studentModel.addStudentFx, addStudentFn]] });

      await allSettled(studentFormModel.formOpened, { scope, params: undefined });
      await allSettled(studentFormModel.formSubmitted, { scope });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Имя ученика обязательно для заполнения",
        type: "error",
      });
      expect(addStudentFn).not.toHaveBeenCalled();
    });

    it("should treat a whitespace-only name as empty", async () => {
      const addStudentFn = vi.fn((_data: CreateStudentDto) => Promise.resolve(mockStudent));
      const scope = fork({ handlers: [[studentModel.addStudentFx, addStudentFn]] });

      await allSettled(studentFormModel.formOpened, { scope, params: undefined });
      await allSettled(studentFormModel.fieldChanged, {
        scope,
        params: { field: "name", value: "   " },
      });
      await allSettled(studentFormModel.formSubmitted, { scope });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Имя ученика обязательно для заполнения",
        type: "error",
      });
      expect(addStudentFn).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a student with a trimmed name when the form is valid", async () => {
      const addStudentFn = vi.fn((_data: CreateStudentDto) => Promise.resolve(mockStudent));
      const scope = fork({ handlers: [[studentModel.addStudentFx, addStudentFn]] });

      await allSettled(studentFormModel.formOpened, { scope, params: undefined });
      await allSettled(studentFormModel.fieldChanged, {
        scope,
        params: { field: "name", value: "  Новый Ученик  " },
      });
      await allSettled(studentFormModel.formSubmitted, { scope });

      expect(addStudentFn).toHaveBeenCalledTimes(1);
      expect(addStudentFn).toHaveBeenCalledWith(expect.objectContaining({ name: "Новый Ученик" }));
    });
  });

  describe("edit", () => {
    it("should update an existing student instead of creating a new one", async () => {
      const updateStudentFn = vi.fn((_params: { id: string; data: UpdateStudentDto }) =>
        Promise.resolve(mockStudent)
      );
      const scope = fork({ handlers: [[studentModel.updateStudentFx, updateStudentFn]] });

      await allSettled(studentFormModel.formOpened, { scope, params: mockStudent });
      await allSettled(studentFormModel.fieldChanged, {
        scope,
        params: { field: "name", value: "Иван Петров" },
      });
      await allSettled(studentFormModel.formSubmitted, { scope });

      expect(updateStudentFn).toHaveBeenCalledTimes(1);
      expect(updateStudentFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "student-1",
          data: expect.objectContaining({ name: "Иван Петров" }),
        })
      );
    });
  });
});
