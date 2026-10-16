import type { Student } from "@shared";

import { COMMISSION_ERROR_TEXTS } from "./studentForm.constants";
import type { CommissionErrorReason } from "./studentForm.types";
import type { StudentFormData } from "../ui/StudentForm/StudentForm.types";

// The column is DECIMAL(10,2) — the same ceiling and precision the server
// enforces, so the form never sends a value the API will reject.
export const MAX_COMMISSION_AMOUNT = 99999999.99;

// An emptied field means "no commission": undefined here, 0 at the API edge.
const parseCommissionAmount = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getCommissionError = (value: string): CommissionErrorReason | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return "not-a-number";
  if (parsed < 0) return "negative";
  if (parsed > MAX_COMMISSION_AMOUNT) return "too-large";
  // Tolerance, not equality: 0.07 * 100 is 7.000000000000001 in binary floats.
  if (Math.abs(Math.round(parsed * 100) - parsed * 100) > 1e-6) return "too-precise";

  return null;
};

const isCommissionInvalid = (value: string): boolean => getCommissionError(value) !== null;

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
  commissionAmount: student.commissionAmount ? student.commissionAmount.toString() : "",
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
  commissionAmount: "",
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
  commissionAmount: parseCommissionAmount(formData.commissionAmount) ?? 0,
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
  commissionAmount: parseCommissionAmount(formData.commissionAmount),
  grade: formData.grade && formData.grade !== "" ? parseInt(formData.grade, 10) : undefined,
  notes: formData.notes.trim() || undefined,
});

export const hasCommissionError = (formData: StudentFormData): boolean =>
  Boolean(formData.name.trim()) && isCommissionInvalid(formData.commissionAmount);

export const getCommissionErrorText = (formData: StudentFormData): string =>
  COMMISSION_ERROR_TEXTS[getCommissionError(formData.commissionAmount) ?? "negative"];

export const isFormSubmittable = (formData: StudentFormData): boolean =>
  Boolean(formData.name.trim()) && !isCommissionInvalid(formData.commissionAmount);

export const isEditMode = (state: {
  formData: StudentFormData;
  editingStudent: Student | undefined;
}): state is { formData: StudentFormData; editingStudent: Student } =>
  state.editingStudent !== undefined;
