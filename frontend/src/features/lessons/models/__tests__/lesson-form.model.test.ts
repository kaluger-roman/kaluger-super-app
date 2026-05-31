import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonsApi } from "@shared";
import type { Lesson } from "@shared";

import {
  $formData,
  $errors,
  $editingLesson,
  $confirmDialog,
  formOpened,
  fieldChanged,
  dateChanged,
  formSubmitted,
  confirmDialogOpened,
  confirmDialogClosed,
} from "../lesson-form.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    lessonsApi: {
      getAll: vi.fn(),
      getById: vi.fn(),
      getUpcoming: vi.fn(),
      getByWeek: vi.fn(),
      getByDateRange: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "SCHEDULED",
  isPaid: false,
  studentId: "student-1",
  price: 1500,
  description: "Test description",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("lesson-form.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formSubmitted (double-submit guard)", () => {
    it("должен вызвать API один раз даже при двух последовательных formSubmitted, пока первый запрос в полёте", async () => {
      const scope = fork({
        values: new Map([
          [
            $formData,
            {
              subject: "PHYSICS",
              lessonType: "EGE",
              description: "",
              startTime: new Date("2026-01-15T10:00:00.000Z"),
              endTime: new Date("2026-01-15T11:00:00.000Z"),
              price: "1500",
              studentId: "student-1",
              homework: "",
              notes: "",
              isRecurring: false,
              isPaid: false,
              isHomeworkSentByTeacher: false,
              paymentDate: undefined,
            },
          ],
        ]),
      });

      let resolveFirst: (lesson: Lesson) => void = () => undefined;
      const firstResponse = new Promise<Lesson>((resolve) => {
        resolveFirst = resolve;
      });

      vi.mocked(lessonsApi.create).mockReturnValueOnce(firstResponse);

      const firstSubmit = allSettled(formSubmitted, { scope });
      const secondSubmit = allSettled(formSubmitted, { scope });

      resolveFirst(createMockLesson({ id: "lesson-created" }));
      await Promise.all([firstSubmit, secondSubmit]);

      expect(lessonsApi.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("formOpened", () => {
    it("should initialize form with lesson data", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      await allSettled(formOpened, { scope, params: { lesson, open: true } });

      const formData = scope.getState($formData);
      expect(formData.subject).toBe("PHYSICS");
      expect(formData.lessonType).toBe("EGE");
      expect(formData.studentId).toBe("student-1");
      expect(formData.price).toBe("1500");
    });

    it("should initialize form with default data when no lesson", async () => {
      const scope = fork();

      await allSettled(formOpened, { scope, params: { lesson: undefined, open: true } });

      const formData = scope.getState($formData);
      expect(formData.subject).toBe("PHYSICS");
      expect(formData.lessonType).toBe("EGE");
      expect(formData.studentId).toBe("");
      expect(formData.price).toBe("");
    });

    it("should set editing lesson when lesson provided", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      await allSettled(formOpened, { scope, params: { lesson, open: true } });

      const editingLesson = scope.getState($editingLesson);
      expect(editingLesson).toEqual(lesson);
    });

    it("should clear editing lesson when no lesson provided", async () => {
      const scope = fork();

      await allSettled(formOpened, { scope, params: { lesson: undefined, open: true } });

      const editingLesson = scope.getState($editingLesson);
      expect(editingLesson).toBeUndefined();
    });

    it("should clear errors when form opened", async () => {
      const scope = fork({
        values: new Map([[$errors, { studentId: "Error" }]]),
      });

      await allSettled(formOpened, { scope, params: { lesson: undefined, open: true } });

      const errors = scope.getState($errors);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it("should not update when dialog is closed", async () => {
      const scope = fork();
      const lesson = createMockLesson();

      await allSettled(formOpened, { scope, params: { lesson, open: false } });

      const formData = scope.getState($formData);
      expect(formData.studentId).toBe("");
    });
  });

  describe("fieldChanged", () => {
    it("should update form field", async () => {
      const scope = fork();

      await allSettled(fieldChanged, { scope, params: { field: "subject", value: "MATHEMATICS" } });

      const formData = scope.getState($formData);
      expect(formData.subject).toBe("MATHEMATICS");
    });

    it("should clear field error when field changed", async () => {
      const scope = fork({
        values: new Map([[$errors, { studentId: "Error", price: "Another error" }]]),
      });

      await allSettled(fieldChanged, { scope, params: { field: "studentId", value: "student-1" } });

      const errors = scope.getState($errors);
      expect(errors.studentId).toBeUndefined();
      expect(errors.price).toBe("Another error");
    });

    it("should update boolean field", async () => {
      const scope = fork();

      await allSettled(fieldChanged, { scope, params: { field: "isPaid", value: true } });

      const formData = scope.getState($formData);
      expect(formData.isPaid).toBe(true);
    });

    it("should update string field", async () => {
      const scope = fork();

      await allSettled(fieldChanged, {
        scope,
        params: { field: "description", value: "New description" },
      });

      const formData = scope.getState($formData);
      expect(formData.description).toBe("New description");
    });
  });

  describe("dateChanged", () => {
    it("should update start time and adjust end time", async () => {
      const scope = fork();
      const originalData = scope.getState($formData);
      const originalDuration = originalData.endTime.getTime() - originalData.startTime.getTime();
      const newStartTime = new Date("2026-01-15T14:00:00.000Z");

      await allSettled(dateChanged, {
        scope,
        params: { field: "startTime", value: newStartTime },
      });

      const formData = scope.getState($formData);
      expect(formData.startTime).toEqual(newStartTime);
      const newDuration = formData.endTime.getTime() - formData.startTime.getTime();
      expect(newDuration).toBe(originalDuration);
    });

    it("should update end time without affecting start time", async () => {
      const scope = fork();
      const originalData = scope.getState($formData);
      const newEndTime = new Date("2026-01-15T13:00:00.000Z");

      await allSettled(dateChanged, { scope, params: { field: "endTime", value: newEndTime } });

      const formData = scope.getState($formData);
      expect(formData.endTime).toEqual(newEndTime);
      expect(formData.startTime).toEqual(originalData.startTime);
    });

    it("should not update when value is null", async () => {
      const scope = fork();
      const originalData = scope.getState($formData);

      await allSettled(dateChanged, { scope, params: { field: "startTime", value: null } });

      const formData = scope.getState($formData);
      expect(formData.startTime).toEqual(originalData.startTime);
    });
  });

  describe("confirmDialog", () => {
    it("should open confirm dialog", async () => {
      const scope = fork();
      const dialogData = {
        open: true,
        title: "Confirm",
        message: "Are you sure?",
        action: () => undefined,
      };

      await allSettled(confirmDialogOpened, { scope, params: dialogData });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(true);
      expect(confirmDialog.title).toBe("Confirm");
      expect(confirmDialog.message).toBe("Are you sure?");
    });

    it("should close confirm dialog", async () => {
      const scope = fork({
        values: new Map([
          [
            $confirmDialog,
            {
              open: true,
              title: "Confirm",
              message: "Are you sure?",
              action: () => undefined,
            },
          ],
        ]),
      });

      await allSettled(confirmDialogClosed, { scope });

      const confirmDialog = scope.getState($confirmDialog);
      expect(confirmDialog.open).toBe(false);
    });
  });
});
