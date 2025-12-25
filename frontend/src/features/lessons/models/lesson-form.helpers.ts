import type { Lesson, CreateLessonDto, UpdateLessonDto } from "@shared";

import type { LessonFormData } from "../ui/LessonForm/types";

export const prepareFormData = (lesson?: Lesson): LessonFormData => {
  if (lesson) {
    return {
      subject: lesson.subject,
      lessonType: lesson.lessonType,
      description: lesson.description || "",
      startTime: new Date(lesson.startTime),
      endTime: new Date(lesson.endTime),
      price: lesson.price?.toString() || "",
      studentId: lesson.studentId,
      homework: lesson.homework || "",
      notes: lesson.notes || "",
      isRecurring: lesson.isRecurring || false,
      isPaid: lesson.isPaid || false,
      isHomeworkSentByTeacher: lesson.isHomeworkSentByTeacher || false,
    };
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    subject: "PHYSICS",
    lessonType: "EGE",
    description: "",
    startTime: now,
    endTime,
    price: "",
    studentId: "",
    homework: "",
    notes: "",
    isRecurring: false,
    isPaid: false,
    isHomeworkSentByTeacher: false,
  };
};

export const validateFormData = (
  formData: LessonFormData
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!formData.studentId) {
    errors.studentId = "Выберите ученика";
  }

  if (formData.startTime >= formData.endTime) {
    errors.endTime = "Время окончания должно быть позже времени начала";
  }

  if (formData.price && (isNaN(Number(formData.price)) || Number(formData.price) < 0)) {
    errors.price = "Цена должна быть положительным числом";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const prepareSubmitData = (
  formData: LessonFormData
): CreateLessonDto & Partial<UpdateLessonDto> => ({
  subject: formData.subject as CreateLessonDto["subject"],
  lessonType: formData.lessonType as CreateLessonDto["lessonType"],
  description: formData.description || undefined,
  startTime: formData.startTime.toISOString(),
  endTime: formData.endTime.toISOString(),
  price: formData.price ? Number(formData.price) : undefined,
  studentId: formData.studentId,
  homework: formData.homework || undefined,
  notes: formData.notes || undefined,
  isRecurring: formData.isRecurring || undefined,
  isPaid: formData.isPaid,
  isHomeworkSentByTeacher: formData.isHomeworkSentByTeacher,
});

export const hasTimeChanged = (lesson: Lesson, formData: LessonFormData): boolean => {
  const oldStart = new Date(lesson.startTime).toISOString();
  const oldEnd = new Date(lesson.endTime).toISOString();
  const newStart = formData.startTime.toISOString();
  const newEnd = formData.endTime.toISOString();
  return oldStart !== newStart || oldEnd !== newEnd;
};

export const hasPriceChanged = (lesson: Lesson, formData: LessonFormData): boolean => {
  const oldPrice = lesson.price ?? null;
  const newPrice = formData.price ? Number(formData.price) : null;
  return oldPrice !== newPrice;
};

export const shouldConfirmTimeChange = (state: {
  formData: LessonFormData;
  editingLesson: Lesson | undefined;
}): boolean =>
  Boolean(
    state.editingLesson !== undefined &&
      state.editingLesson.isRecurring &&
      state.editingLesson.status === "SCHEDULED" &&
      hasTimeChanged(state.editingLesson, state.formData)
  );

export const shouldConfirmPriceChange = (state: {
  formData: LessonFormData;
  editingLesson: Lesson | undefined;
}): boolean =>
  Boolean(
    state.editingLesson !== undefined &&
      state.editingLesson.isRecurring &&
      state.editingLesson.status === "SCHEDULED" &&
      !hasTimeChanged(state.editingLesson, state.formData) &&
      hasPriceChanged(state.editingLesson, state.formData)
  );

export const shouldUpdateDirectly = (state: {
  formData: LessonFormData;
  editingLesson: Lesson | undefined;
}): state is { formData: LessonFormData; editingLesson: Lesson } =>
  state.editingLesson !== undefined &&
  (!state.editingLesson.isRecurring ||
    state.editingLesson.status !== "SCHEDULED" ||
    (!hasTimeChanged(state.editingLesson, state.formData) &&
      !hasPriceChanged(state.editingLesson, state.formData)));

export const clearFieldError = (
  errors: Record<string, string>,
  field: string
): Record<string, string> => {
  const newErrors = { ...errors };
  if (newErrors[field]) {
    delete newErrors[field];
  }
  return newErrors;
};

export const updateFormField = (
  formData: LessonFormData,
  field: string,
  value: unknown
): LessonFormData => ({
  ...formData,
  [field]: value,
});

export const updateFormDate = (
  formData: LessonFormData,
  field: "startTime" | "endTime",
  value: Date | null
): LessonFormData => {
  if (!value) return formData;

  const newData = { ...formData, [field]: value };

  if (field === "startTime") {
    let duration = formData.endTime.getTime() - formData.startTime.getTime();
    if (!duration || duration <= 0) {
      duration = 60 * 60 * 1000;
    }
    newData.endTime = new Date(value.getTime() + duration);
  }

  return newData;
};
