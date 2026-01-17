import type { FormEvent } from "react";

import { createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";

import { lessonModel } from "@entities";
import type { Lesson, CreateLessonDto, UpdateLessonDto } from "@shared";

import {
  prepareFormData,
  validateFormData,
  prepareSubmitData,
  shouldConfirmTimeChange,
  shouldConfirmPriceChange,
  shouldUpdateDirectly,
  clearFieldError,
  updateFormField,
  updateFormDate,
} from "./lesson-form.helpers";
import type { LessonFormData, ConfirmDialogData } from "../ui/LessonForm/types";

export const LessonFormGate = createGate<{ lesson?: Lesson; open: boolean }>();

export const $formData = createStore<LessonFormData>({
  subject: "PHYSICS",
  lessonType: "EGE",
  description: "",
  startTime: new Date(),
  endTime: new Date(Date.now() + 60 * 60 * 1000),
  price: "",
  studentId: "",
  homework: "",
  notes: "",
  isRecurring: false,
  isPaid: false,
  isHomeworkSentByTeacher: false,
  paymentDate: undefined,
});

export const $errors = createStore<Record<string, string>>({});

export const $confirmDialog = createStore<ConfirmDialogData>({
  open: false,
  title: "",
  message: "",
  action: () => undefined,
});

export const $editingLesson = createStore<Lesson | undefined>(undefined, { skipVoid: false });

export const formOpened = createEvent<{ lesson?: Lesson; open: boolean }>();
export const fieldChanged = createEvent<{ field: string; value: unknown }>();
export const dateChanged = createEvent<{ field: "startTime" | "endTime"; value: Date | null }>();
export const formSubmitted = createEvent<FormEvent>();
export const confirmDialogOpened = createEvent<ConfirmDialogData>();
export const confirmDialogClosed = createEvent();
export const confirmActionTriggered = createEvent();

sample({
  clock: formOpened,
  filter: ({ open }) => open,
  fn: ({ lesson }) => prepareFormData(lesson),
  target: $formData,
});

sample({
  clock: formOpened,
  filter: ({ open }) => open,
  fn: ({ lesson }) => lesson,
  target: $editingLesson,
});

sample({
  clock: formOpened,
  filter: ({ open }) => open,
  fn: () => ({}),
  target: $errors,
});

sample({
  clock: fieldChanged,
  source: { formData: $formData, errors: $errors },
  fn: ({ errors }, { field }) => clearFieldError(errors, field),
  target: $errors,
});

sample({
  clock: fieldChanged,
  source: $formData,
  fn: (formData, { field, value }) => updateFormField(formData, field, value),
  target: $formData,
});

sample({
  clock: dateChanged,
  source: $formData,
  fn: (formData, { field, value }) => updateFormDate(formData, field, value),
  target: $formData,
});

sample({
  clock: confirmDialogOpened,
  target: $confirmDialog,
});

sample({
  clock: confirmDialogClosed,
  source: $confirmDialog,
  fn: (dialog) => ({ ...dialog, open: false }),
  target: $confirmDialog,
});

const validated = sample({
  clock: formSubmitted,
  source: $formData,
  fn: validateFormData,
});

sample({
  clock: validated,
  filter: (result: ReturnType<typeof validateFormData>) => !result.isValid,
  fn: (result: ReturnType<typeof validateFormData>) => result.errors,
  target: $errors,
});

const validFormSubmit = sample({
  clock: validated,
  source: { formData: $formData, editingLesson: $editingLesson },
  filter: (_, result: ReturnType<typeof validateFormData>) => result.isValid,
});

sample({
  clock: validFormSubmit,
  filter: (state: { formData: LessonFormData; editingLesson: Lesson | undefined }) =>
    state.editingLesson === undefined,
  fn: (state: { formData: LessonFormData; editingLesson: Lesson | undefined }) =>
    prepareSubmitData(state.formData) as CreateLessonDto,
  target: lessonModel.addLesson,
});

sample({
  clock: validFormSubmit,
  filter: shouldConfirmTimeChange,
  fn: () => ({
    open: true,
    title: "Изменение времени регулярного урока",
    message:
      "Вы уверены? Время будет изменено у всех ещё несостоявшихся запланированных и не перенесённых регулярных уроков в этой серии.",
    action: () => confirmActionTriggered(),
  }),
  target: $confirmDialog,
});

sample({
  clock: validFormSubmit,
  filter: shouldConfirmPriceChange,
  fn: () => ({
    open: true,
    title: "Изменение цены регулярного урока",
    message:
      "Вы уверены? Цена будет изменена у всех ещё несостоявшихся запланированных и не перенесённых регулярных уроков в этой серии.",
    action: () => confirmActionTriggered(),
  }),
  target: $confirmDialog,
});

sample({
  clock: [validFormSubmit, confirmActionTriggered],
  source: { formData: $formData, editingLesson: $editingLesson },
  filter: shouldUpdateDirectly,
  fn: (state: { formData: LessonFormData; editingLesson: Lesson }) => ({
    id: state.editingLesson.id,
    data: prepareSubmitData(state.formData) as UpdateLessonDto,
  }),
  target: lessonModel.updateLesson,
});

sample({
  clock: confirmActionTriggered,
  source: { formData: $formData, editingLesson: $editingLesson },
  filter: (state): state is { formData: LessonFormData; editingLesson: Lesson } =>
    state.editingLesson !== undefined,
  fn: (state: { formData: LessonFormData; editingLesson: Lesson }) => ({
    id: state.editingLesson.id,
    data: prepareSubmitData(state.formData) as UpdateLessonDto,
  }),
  target: lessonModel.updateLesson,
});

sample({
  clock: confirmActionTriggered,
  fn: () => ({
    open: false,
    title: "",
    message: "",
    action: () => undefined,
  }),
  target: $confirmDialog,
});
