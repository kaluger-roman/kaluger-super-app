import type { Prisma } from "@prisma/client";

import type { CreateStudentDto, UpdateStudentDto } from "../../types";

const MAX_COMMISSION_AMOUNT = 99999999.99;

// `0` is a legal commission, so the field is probed explicitly instead of by
// truthiness: `if (value && value < 0)` would silently pass NaN through.
const isCommissionOmitted = (value: number | null | undefined): value is null | undefined =>
  value === undefined || value === null;

export const normalizeCommissionAmount = (value: number | null | undefined): number =>
  isCommissionOmitted(value) ? 0 : value;

const collectCommissionErrors = (value: unknown, errors: string[]) => {
  if (value === undefined || value === null) return;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push("Комиссия должна быть числом");
    return;
  }

  if (value < 0) {
    errors.push("Комиссия не может быть отрицательной");
    return;
  }

  // The column is DECIMAL(10,2): anything larger or with more precision would
  // be rejected or silently rounded by the database.
  if (value > MAX_COMMISSION_AMOUNT) {
    errors.push("Комиссия не может превышать 99 999 999,99 ₽");
    return;
  }

  // Tolerance, not equality: 0.07 * 100 is 7.000000000000001 in binary floats.
  if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) {
    errors.push("Комиссия не может содержать больше двух знаков после запятой");
  }
};

export const validateCreateStudentDto = (data: CreateStudentDto) => {
  const errors: string[] = [];

  if (!data.name) {
    errors.push("Имя обязательно для заполнения");
  }

  if (!data.contactMethod) {
    errors.push("Не выбран способ связи (WhatsApp, Telegram или MAX)");
  }

  if (data.hourlyRate && data.hourlyRate < 0) {
    errors.push("Почасовая ставка должна быть положительной");
  }

  if (
    typeof data.grade !== "undefined" &&
    data.grade !== null &&
    (typeof data.grade !== "number" || data.grade < 1 || data.grade > 11)
  ) {
    errors.push("Класс должен быть числом от 1 до 11");
  }

  collectCommissionErrors(data.commissionAmount, errors);

  return errors;
};

export const validateUpdateStudentDto = (data: UpdateStudentDto) => {
  const errors: string[] = [];

  if ("contactMethod" in data && !data.contactMethod) {
    errors.push("Не выбран способ связи (WhatsApp, Telegram или MAX)");
  }

  if (data.hourlyRate && data.hourlyRate < 0) {
    errors.push("Почасовая ставка должна быть положительной");
  }

  collectCommissionErrors(data.commissionAmount, errors);

  return errors;
};

export const prepareUpdateData = (updateData: UpdateStudentDto) => {
  const { commissionAmount: _commissionAmount, ...rest } = updateData;
  const preparedData: Prisma.StudentUpdateInput = { ...rest };
  if ("contactMethod" in updateData) {
    preparedData.contactMethod = updateData.contactMethod || undefined;
  }
  if ("parentPhone" in updateData) {
    preparedData.parentPhone = updateData.parentPhone === "" ? null : updateData.parentPhone;
  }
  if ("parentContactMethod" in updateData) {
    preparedData.parentContactMethod = updateData.parentContactMethod || null;
  }
  if ("telegramNick" in updateData) {
    preparedData.telegramNick = updateData.telegramNick === "" ? null : updateData.telegramNick;
  }
  if ("parentTelegramNick" in updateData) {
    preparedData.parentTelegramNick =
      updateData.parentTelegramNick === "" ? null : updateData.parentTelegramNick;
  }
  if ("parentName" in updateData) {
    preparedData.parentName = updateData.parentName === "" ? null : updateData.parentName;
  }
  if ("phone" in updateData) {
    preparedData.phone = updateData.phone === "" ? null : updateData.phone;
  }
  if ("notes" in updateData) {
    preparedData.notes = updateData.notes === "" ? null : updateData.notes;
  }
  if ("hourlyRate" in updateData) {
    preparedData.hourlyRate =
      updateData.hourlyRate === null || updateData.hourlyRate === undefined
        ? null
        : updateData.hourlyRate;
  }
  if ("grade" in updateData) {
    preparedData.grade =
      updateData.grade === null || updateData.grade === undefined ? null : updateData.grade;
  }
  if ("commissionAmount" in updateData) {
    preparedData.commissionAmount = normalizeCommissionAmount(updateData.commissionAmount);
  }

  return preparedData;
};
