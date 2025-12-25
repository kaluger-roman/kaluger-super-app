import { createStore, createEvent, sample } from "effector";

import { studentModel } from "@entities";
import type { Student } from "@shared";
import { notificationsModel } from "@shared";

import {
  prepareFormDataForEdit,
  prepareEmptyFormData,
  prepareUpdateData,
  prepareCreateData,
  isEditMode,
} from "./student-form.helpers";
import type { StudentFormData } from "../ui/StudentForm/types";

export const formOpened = createEvent<Student | undefined>();
export const formClosed = createEvent();
export const fieldChanged = createEvent<{ field: string; value: string }>();
export const gradeChanged = createEvent<string>();
export const formSubmitted = createEvent<React.FormEvent>();
export const deleteRequested = createEvent();
export const deleteConfirmed = createEvent();
export const deleteDialogClosed = createEvent();

export const $formData = createStore<StudentFormData>({
  name: "",
  contactMethod: "WHATSAPP",
  parentPhone: "",
  parentName: "",
  parentContactMethod: "WHATSAPP",
  telegramNick: "",
  parentTelegramNick: "",
  phone: "",
  hourlyRate: "",
  grade: "",
  notes: "",
});

export const $editingStudent = createStore<Student | undefined>(undefined, { skipVoid: false });
export const $deleteDialogOpen = createStore<boolean>(false);

sample({
  clock: formOpened,
  filter: (student): student is Student => student !== undefined,
  fn: prepareFormDataForEdit,
  target: $formData,
});

sample({
  clock: formOpened,
  filter: (student) => student === undefined,
  fn: prepareEmptyFormData,
  target: $formData,
});

sample({
  clock: formOpened,
  target: $editingStudent,
});

sample({
  clock: formClosed,
  fn: () => undefined,
  target: $editingStudent,
});

sample({
  clock: fieldChanged,
  source: $formData,
  fn: (formData, { field, value }) => ({
    ...formData,
    [field]: value,
  }),
  target: $formData,
});

sample({
  clock: gradeChanged,
  source: $formData,
  fn: (formData, grade) => ({
    ...formData,
    grade,
  }),
  target: $formData,
});

sample({
  clock: deleteRequested,
  fn: () => true,
  target: $deleteDialogOpen,
});

sample({
  clock: deleteDialogClosed,
  fn: () => false,
  target: $deleteDialogOpen,
});

const validatedSubmit = sample({
  clock: formSubmitted,
  source: { formData: $formData, editingStudent: $editingStudent },
  filter: ({ formData }) => {
    if (!formData.name.trim()) {
      notificationsModel.showNotification({
        type: "error",
        message: "Имя студента обязательно для заполнения",
      });
      return false;
    }
    return true;
  },
});

sample({
  clock: validatedSubmit,
  source: { formData: $formData, editingStudent: $editingStudent },
  filter: isEditMode,
  fn: ({ formData, editingStudent }) => ({
    id: editingStudent.id,
    data: prepareUpdateData(formData),
  }),
  target: studentModel.updateStudent,
});

sample({
  clock: validatedSubmit,
  source: { formData: $formData, editingStudent: $editingStudent },
  filter: ({ editingStudent }) => editingStudent === undefined,
  fn: ({ formData }) => prepareCreateData(formData),
  target: studentModel.addStudent,
});

sample({
  clock: deleteConfirmed,
  source: $editingStudent,
  filter: (student): student is Student => student !== undefined,
  fn: (student: Student) => student.id,
  target: studentModel.removeStudent,
});

sample({
  clock: deleteConfirmed,
  fn: () => false,
  target: $deleteDialogOpen,
});
