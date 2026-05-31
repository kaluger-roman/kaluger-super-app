import { describe, it, expect } from "vitest";

import type { Lesson, Student } from "@shared";

import type { LessonFormData } from "../../ui/LessonForm/types";
import {
  applyHourlyRateAutofill,
  prepareFormData,
  validateFormData,
  prepareSubmitData,
  hasTimeChanged,
  hasPriceChanged,
  shouldConfirmTimeChange,
  shouldConfirmPriceChange,
  shouldUpdateDirectly,
  clearFieldError,
  updateFormField,
  updateFormDate,
} from "../lesson-form.helpers";

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: "lesson-1",
  subject: "PHYSICS",
  lessonType: "EGE",
  startTime: "2026-01-15T10:00:00.000Z",
  endTime: "2026-01-15T11:00:00.000Z",
  status: "SCHEDULED",
  isPaid: false,
  studentId: "student-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("prepareFormData", () => {
  it("should prepare form data from lesson", () => {
    const lesson = createMockLesson({
      description: "Test description",
      price: 1500,
      homework: "Do exercises",
      notes: "Important notes",
      isRecurring: true,
      isPaid: true,
      isHomeworkSentByTeacher: true,
    });

    const result = prepareFormData(lesson);

    expect(result.subject).toBe("PHYSICS");
    expect(result.lessonType).toBe("EGE");
    expect(result.description).toBe("Test description");
    expect(result.price).toBe("1500");
    expect(result.homework).toBe("Do exercises");
    expect(result.notes).toBe("Important notes");
    expect(result.isRecurring).toBe(true);
    expect(result.isPaid).toBe(true);
    expect(result.isHomeworkSentByTeacher).toBe(true);
    expect(result.studentId).toBe("student-1");
  });

  it("should handle lesson without optional fields", () => {
    const lesson = createMockLesson();

    const result = prepareFormData(lesson);

    expect(result.description).toBe("");
    expect(result.price).toBe("");
    expect(result.homework).toBe("");
    expect(result.notes).toBe("");
    expect(result.isRecurring).toBe(false);
    expect(result.isPaid).toBe(false);
    expect(result.isHomeworkSentByTeacher).toBe(false);
  });

  it("should create default form data when no lesson provided", () => {
    const result = prepareFormData();

    expect(result.subject).toBe("PHYSICS");
    expect(result.lessonType).toBe("EGE");
    expect(result.description).toBe("");
    expect(result.price).toBe("");
    expect(result.studentId).toBe("");
    expect(result.homework).toBe("");
    expect(result.notes).toBe("");
    expect(result.isRecurring).toBe(false);
    expect(result.isPaid).toBe(false);
    expect(result.isHomeworkSentByTeacher).toBe(false);
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
  });

  it("should set endTime 1 hour after startTime for new lesson", () => {
    const result = prepareFormData();

    const duration = result.endTime.getTime() - result.startTime.getTime();
    expect(duration).toBe(60 * 60 * 1000); // 1 hour in milliseconds
  });
});

describe("validateFormData", () => {
  const createValidFormData = (overrides: Partial<LessonFormData> = {}): LessonFormData => ({
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
    ...overrides,
  });

  it("should validate correct form data", () => {
    const formData = createValidFormData();

    const result = validateFormData(formData);

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("should return error when studentId is missing", () => {
    const formData = createValidFormData({ studentId: "" });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(false);
    expect(result.errors.studentId).toBe("Выберите ученика");
  });

  it("should return error when endTime is before startTime", () => {
    const formData = createValidFormData({
      startTime: new Date("2026-01-15T11:00:00.000Z"),
      endTime: new Date("2026-01-15T10:00:00.000Z"),
    });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(false);
    expect(result.errors.endTime).toBe("Время окончания должно быть позже времени начала");
  });

  it("should return error when endTime equals startTime", () => {
    const formData = createValidFormData({
      startTime: new Date("2026-01-15T10:00:00.000Z"),
      endTime: new Date("2026-01-15T10:00:00.000Z"),
    });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(false);
    expect(result.errors.endTime).toBe("Время окончания должно быть позже времени начала");
  });

  it("should return error when price is negative", () => {
    const formData = createValidFormData({ price: "-100" });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe("Цена должна быть положительным числом");
  });

  it("should return error when price is not a number", () => {
    const formData = createValidFormData({ price: "abc" });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe("Цена должна быть положительным числом");
  });

  it("should allow empty price", () => {
    const formData = createValidFormData({ price: "" });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(true);
  });

  it("should return multiple errors", () => {
    const formData = createValidFormData({
      studentId: "",
      endTime: new Date("2026-01-15T09:00:00.000Z"),
      price: "invalid",
    });

    const result = validateFormData(formData);

    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors)).toHaveLength(3);
    expect(result.errors.studentId).toBeDefined();
    expect(result.errors.endTime).toBeDefined();
    expect(result.errors.price).toBeDefined();
  });
});

describe("prepareSubmitData", () => {
  const createValidFormData = (overrides: Partial<LessonFormData> = {}): LessonFormData => ({
    subject: "PHYSICS",
    lessonType: "EGE",
    description: "Test lesson",
    startTime: new Date("2026-01-15T10:00:00.000Z"),
    endTime: new Date("2026-01-15T11:00:00.000Z"),
    price: "1500",
    studentId: "student-1",
    homework: "Do exercises",
    notes: "Some notes",
    isRecurring: true,
    isPaid: true,
    isHomeworkSentByTeacher: true,
    ...overrides,
  });

  it("should prepare submit data with all fields", () => {
    const formData = createValidFormData();

    const result = prepareSubmitData(formData);

    expect(result.subject).toBe("PHYSICS");
    expect(result.lessonType).toBe("EGE");
    expect(result.description).toBe("Test lesson");
    expect(result.price).toBe(1500);
    expect(result.homework).toBe("Do exercises");
    expect(result.notes).toBe("Some notes");
    expect(result.isRecurring).toBe(true);
    expect(result.isPaid).toBe(true);
    expect(result.isHomeworkSentByTeacher).toBe(true);
    expect(result.studentId).toBe("student-1");
    expect(typeof result.startTime).toBe("string");
    expect(typeof result.endTime).toBe("string");
  });

  it("should convert empty strings to undefined", () => {
    const formData = createValidFormData({
      description: "",
      homework: "",
      notes: "",
      price: "",
    });

    const result = prepareSubmitData(formData);

    expect(result.description).toBeUndefined();
    expect(result.homework).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.price).toBeUndefined();
  });

  it("should convert price string to number", () => {
    const formData = createValidFormData({ price: "2000" });

    const result = prepareSubmitData(formData);

    expect(result.price).toBe(2000);
  });

  it("should handle isRecurring as undefined when false", () => {
    const formData = createValidFormData({ isRecurring: false });

    const result = prepareSubmitData(formData);

    expect(result.isRecurring).toBeUndefined();
  });
});

describe("hasTimeChanged", () => {
  it("should return true when start time changed", () => {
    const lesson = createMockLesson({
      startTime: "2026-01-15T10:00:00.000Z",
      endTime: "2026-01-15T11:00:00.000Z",
    });
    const formData = prepareFormData(lesson);
    formData.startTime = new Date("2026-01-15T12:00:00.000Z");
    formData.endTime = new Date("2026-01-15T13:00:00.000Z");

    const result = hasTimeChanged(lesson, formData);

    expect(result).toBe(true);
  });

  it("should return true when end time changed", () => {
    const lesson = createMockLesson({
      startTime: "2026-01-15T10:00:00.000Z",
      endTime: "2026-01-15T11:00:00.000Z",
    });
    const formData = prepareFormData(lesson);
    formData.endTime = new Date("2026-01-15T12:00:00.000Z");

    const result = hasTimeChanged(lesson, formData);

    expect(result).toBe(true);
  });

  it("should return false when time not changed", () => {
    const lesson = createMockLesson({
      startTime: "2026-01-15T10:00:00.000Z",
      endTime: "2026-01-15T11:00:00.000Z",
    });
    const formData = prepareFormData(lesson);

    const result = hasTimeChanged(lesson, formData);

    expect(result).toBe(false);
  });
});

describe("hasPriceChanged", () => {
  it("should return true when price changed", () => {
    const lesson = createMockLesson({ price: 1000 });
    const formData = prepareFormData(lesson);
    formData.price = "1500";

    const result = hasPriceChanged(lesson, formData);

    expect(result).toBe(true);
  });

  it("should return true when price changed from undefined to value", () => {
    const lesson = createMockLesson({ price: undefined });
    const formData = prepareFormData(lesson);
    formData.price = "1500";

    const result = hasPriceChanged(lesson, formData);

    expect(result).toBe(true);
  });

  it("should return true when price changed to undefined", () => {
    const lesson = createMockLesson({ price: 1000 });
    const formData = prepareFormData(lesson);
    formData.price = "";

    const result = hasPriceChanged(lesson, formData);

    expect(result).toBe(true);
  });

  it("should return false when price not changed", () => {
    const lesson = createMockLesson({ price: 1500 });
    const formData = prepareFormData(lesson);

    const result = hasPriceChanged(lesson, formData);

    expect(result).toBe(false);
  });

  it("should return false when both prices are undefined", () => {
    const lesson = createMockLesson({ price: undefined });
    const formData = prepareFormData(lesson);
    formData.price = "";

    const result = hasPriceChanged(lesson, formData);

    expect(result).toBe(false);
  });
});

describe("shouldConfirmTimeChange", () => {
  it("should return true for recurring scheduled lesson with time change", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "SCHEDULED",
      startTime: "2026-01-15T10:00:00.000Z",
    });
    const formData = prepareFormData(lesson);
    formData.startTime = new Date("2026-01-15T12:00:00.000Z");
    formData.endTime = new Date("2026-01-15T13:00:00.000Z");

    const result = shouldConfirmTimeChange({ formData, editingLesson: lesson });

    expect(result).toBe(true);
  });

  it("should return false for non-recurring lesson", () => {
    const lesson = createMockLesson({
      isRecurring: false,
      status: "SCHEDULED",
    });
    const formData = prepareFormData(lesson);
    formData.startTime = new Date("2026-01-15T12:00:00.000Z");

    const result = shouldConfirmTimeChange({ formData, editingLesson: lesson });

    expect(result).toBe(false);
  });

  it("should return false for completed lesson", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "COMPLETED",
    });
    const formData = prepareFormData(lesson);
    formData.startTime = new Date("2026-01-15T12:00:00.000Z");

    const result = shouldConfirmTimeChange({ formData, editingLesson: lesson });

    expect(result).toBe(false);
  });

  it("should return false when no time change", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "SCHEDULED",
    });
    const formData = prepareFormData(lesson);

    const result = shouldConfirmTimeChange({ formData, editingLesson: lesson });

    expect(result).toBe(false);
  });

  it("should return false when no editing lesson", () => {
    const formData = prepareFormData();

    const result = shouldConfirmTimeChange({ formData, editingLesson: undefined });

    expect(result).toBe(false);
  });
});

describe("shouldConfirmPriceChange", () => {
  it("should return true for recurring scheduled lesson with price change only", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "SCHEDULED",
      price: 1000,
    });
    const formData = prepareFormData(lesson);
    formData.price = "1500";

    const result = shouldConfirmPriceChange({ formData, editingLesson: lesson });

    expect(result).toBe(true);
  });

  it("should return false when time also changed", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "SCHEDULED",
      price: 1000,
    });
    const formData = prepareFormData(lesson);
    formData.price = "1500";
    formData.startTime = new Date("2026-01-15T12:00:00.000Z");

    const result = shouldConfirmPriceChange({ formData, editingLesson: lesson });

    expect(result).toBe(false);
  });

  it("should return false for non-recurring lesson", () => {
    const lesson = createMockLesson({
      isRecurring: false,
      status: "SCHEDULED",
      price: 1000,
    });
    const formData = prepareFormData(lesson);
    formData.price = "1500";

    const result = shouldConfirmPriceChange({ formData, editingLesson: lesson });

    expect(result).toBe(false);
  });
});

describe("shouldUpdateDirectly", () => {
  it("should return true for non-recurring lesson", () => {
    const lesson = createMockLesson({
      isRecurring: false,
      status: "SCHEDULED",
    });
    const formData = prepareFormData(lesson);

    const result = shouldUpdateDirectly({ formData, editingLesson: lesson });

    expect(result).toBe(true);
  });

  it("should return true for completed lesson", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "COMPLETED",
    });
    const formData = prepareFormData(lesson);

    const result = shouldUpdateDirectly({ formData, editingLesson: lesson });

    expect(result).toBe(true);
  });

  it("should return true for recurring scheduled lesson without changes", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "SCHEDULED",
      price: 1000,
    });
    const formData = prepareFormData(lesson);

    const result = shouldUpdateDirectly({ formData, editingLesson: lesson });

    expect(result).toBe(true);
  });

  it("should return false for recurring scheduled lesson with time change", () => {
    const lesson = createMockLesson({
      isRecurring: true,
      status: "SCHEDULED",
    });
    const formData = prepareFormData(lesson);
    formData.startTime = new Date("2026-01-15T12:00:00.000Z");

    const result = shouldUpdateDirectly({ formData, editingLesson: lesson });

    expect(result).toBe(false);
  });

  it("should return false when no editing lesson", () => {
    const formData = prepareFormData();

    const result = shouldUpdateDirectly({ formData, editingLesson: undefined });

    expect(result).toBe(false);
  });
});

describe("clearFieldError", () => {
  it("should remove field error", () => {
    const errors = { studentId: "Error", price: "Another error" };

    const result = clearFieldError(errors, "studentId");

    expect(result.studentId).toBeUndefined();
    expect(result.price).toBe("Another error");
  });

  it("should return same errors when field not found", () => {
    const errors = { price: "Error" };

    const result = clearFieldError(errors, "studentId");

    expect(result).toEqual(errors);
  });

  it("should handle empty errors", () => {
    const result = clearFieldError({}, "studentId");

    expect(result).toEqual({});
  });
});

describe("updateFormField", () => {
  it("should update form field", () => {
    const formData = prepareFormData();

    const result = updateFormField(formData, "subject", "MATHEMATICS");

    expect(result.subject).toBe("MATHEMATICS");
    expect(result.lessonType).toBe(formData.lessonType);
  });

  it("should update boolean field", () => {
    const formData = prepareFormData();

    const result = updateFormField(formData, "isPaid", true);

    expect(result.isPaid).toBe(true);
  });
});

describe("updateFormDate", () => {
  it("should update start time and adjust end time", () => {
    const formData = prepareFormData();
    const originalDuration = formData.endTime.getTime() - formData.startTime.getTime();
    const newStartTime = new Date("2026-01-15T14:00:00.000Z");

    const result = updateFormDate(formData, "startTime", newStartTime);

    expect(result.startTime).toEqual(newStartTime);
    const newDuration = result.endTime.getTime() - result.startTime.getTime();
    expect(newDuration).toBe(originalDuration);
  });

  it("should update end time without affecting start time", () => {
    const formData = prepareFormData();
    const newEndTime = new Date("2026-01-15T13:00:00.000Z");

    const result = updateFormDate(formData, "endTime", newEndTime);

    expect(result.endTime).toEqual(newEndTime);
    expect(result.startTime).toEqual(formData.startTime);
  });

  it("should return unchanged data when value is null", () => {
    const formData = prepareFormData();

    const result = updateFormDate(formData, "startTime", null);

    expect(result).toEqual(formData);
  });

  it("should use default 1 hour duration when original duration is invalid", () => {
    const formData = prepareFormData();
    formData.startTime = new Date("2026-01-15T10:00:00.000Z");
    formData.endTime = new Date("2026-01-15T09:00:00.000Z"); // Invalid: before start
    const newStartTime = new Date("2026-01-15T14:00:00.000Z");

    const result = updateFormDate(formData, "startTime", newStartTime);

    const duration = result.endTime.getTime() - result.startTime.getTime();
    expect(duration).toBe(60 * 60 * 1000); // 1 hour
  });
});

const createMockStudent = (overrides: Partial<Student> = {}): Student =>
  ({
    id: "s-1",
    name: "Иван",
    contactMethod: "TELEGRAM",
    phone: "+79000000001",
    hourlyRate: 1500,
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as Student);

describe("applyHourlyRateAutofill", () => {
  const baseFormData = (overrides: Partial<LessonFormData> = {}): LessonFormData => ({
    ...prepareFormData(),
    studentId: "s-1",
    price: "",
    ...overrides,
  });

  it("подставляет почасовую ставку активного ученика, когда цена пуста", () => {
    const result = applyHourlyRateAutofill(
      baseFormData(),
      [createMockStudent({ id: "s-1", hourlyRate: 2000 })],
      []
    );

    expect(result.price).toBe("2000");
  });

  it("подставляет ставку архивного ученика, если он не найден среди активных", () => {
    const result = applyHourlyRateAutofill(
      baseFormData({ studentId: "s-arch" }),
      [],
      [createMockStudent({ id: "s-arch", hourlyRate: 800 })]
    );

    expect(result.price).toBe("800");
  });

  it("не трогает поле цены, если пользователь уже ввёл значение", () => {
    const result = applyHourlyRateAutofill(
      baseFormData({ price: "999" }),
      [createMockStudent({ id: "s-1", hourlyRate: 2000 })],
      []
    );

    expect(result.price).toBe("999");
  });

  it("ничего не подставляет, если у ученика нет ставки", () => {
    const result = applyHourlyRateAutofill(
      baseFormData(),
      [createMockStudent({ id: "s-1", hourlyRate: null })],
      []
    );

    expect(result.price).toBe("");
  });

  it("ничего не подставляет, если студент не выбран", () => {
    const result = applyHourlyRateAutofill(
      baseFormData({ studentId: "" }),
      [createMockStudent({ id: "s-1", hourlyRate: 2000 })],
      []
    );

    expect(result.price).toBe("");
  });
});
