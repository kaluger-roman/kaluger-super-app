import type { Student } from "@shared";

import type { StudentFormData } from "../ui/StudentForm/types";

export const prepareFormDataForEdit = (student: Student): StudentFormData => ({
  name: student.name || "",
  contactMethod: student.contactMethod || "WHATSAPP",
  parentPhone: student.parentPhone || "",
  parentName: student.parentName || "",
  parentContactMethod: student.parentContactMethod || "WHATSAPP",
  telegramNick: student.telegramNick || "",
  parentTelegramNick: student.parentTelegramNick || "",
  phone: student.phone || "",
  hourlyRate: student.hourlyRate?.toString() || "",
  grade: student.grade?.toString() || "",
  notes: student.notes || "",
});

export const prepareEmptyFormData = (): StudentFormData => ({
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

export const prepareUpdateData = (formData: StudentFormData) => ({
  name: formData.name.trim(),
  contactMethod: formData.contactMethod,
  telegramNick: formData.telegramNick?.trim() || "",
  parentPhone: formData.parentPhone?.trim() || "",
  parentName: formData.parentName?.trim() || "",
  parentContactMethod: formData.parentContactMethod || undefined,
  parentTelegramNick: formData.parentTelegramNick?.trim() || "",
  phone: formData.phone.trim() || "",
  hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
  grade: formData.grade && formData.grade !== "" ? parseInt(formData.grade, 10) : null,
  notes: formData.notes.trim() || "",
});

export const prepareCreateData = (formData: StudentFormData) => ({
  name: formData.name.trim(),
  contactMethod: formData.contactMethod || undefined,
  telegramNick: formData.telegramNick?.trim() || undefined,
  parentPhone: formData.parentPhone?.trim() || undefined,
  parentName: formData.parentName?.trim() || undefined,
  parentTelegramNick: formData.parentTelegramNick?.trim() || undefined,
  parentContactMethod: formData.parentContactMethod || undefined,
  phone: formData.phone.trim() || undefined,
  hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
  grade: formData.grade && formData.grade !== "" ? parseInt(formData.grade, 10) : undefined,
  notes: formData.notes.trim() || undefined,
});

export const isEditMode = (state: {
  formData: StudentFormData;
  editingStudent: Student | undefined;
}): state is { formData: StudentFormData; editingStudent: Student } =>
  state.editingStudent !== undefined;
