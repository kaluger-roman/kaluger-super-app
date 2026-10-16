import type { CreateLessonDto, ContactMethod } from "../../types";
import { truncateToMinute } from "../../utils/time";

export const CONTACT_METHODS: ContactMethod[] = ["WHATSAPP", "TELEGRAM", "MAX"];

export const TAX_EXEMPT_INVALID_ERROR = "Некорректное значение признака «Не облагается налогом»";

export const MAX_RECEIVED_AMOUNT = 99_999_999.99;

export const RECEIVED_AMOUNT_INVALID_ERROR =
  "Полученная сумма должна быть неотрицательным числом не больше 99 999 999,99 ₽ с точностью до копеек";

export const RECEIVED_AMOUNT_UNPAID_ERROR =
  "Полученную сумму можно указать только у оплаченного урока";

const validateProspectFields = (data: CreateLessonDto): string | null => {
  const { studentId, prospectName, prospectPhone, prospectContactMethod } = data;

  if (studentId) {
    if (
      prospectName !== undefined ||
      prospectPhone !== undefined ||
      prospectContactMethod !== undefined
    ) {
      return "Данные пробного ученика нельзя указывать вместе с учеником";
    }
    return null;
  }

  if (prospectName === undefined) {
    return "Укажите ученика или имя для пробного урока без ученика";
  }

  if (!prospectName.trim()) {
    return "Имя ученика для пробного урока обязательно";
  }

  if (data.isRecurring) {
    return "Пробный урок без ученика не может быть повторяющимся";
  }

  if (prospectContactMethod !== undefined && !CONTACT_METHODS.includes(prospectContactMethod)) {
    return "Недопустимый способ связи (WhatsApp, Telegram или MAX)";
  }

  return null;
};

export const validateLessonData = (data: CreateLessonDto) => {
  const { subject, lessonType, startTime, endTime, price } = data;

  if (!subject || !lessonType || !startTime || !endTime) {
    return {
      isValid: false,
      error: "Предмет, тип урока, время начала и время окончания обязательны",
    };
  }

  const prospectError = validateProspectFields(data);
  if (prospectError) {
    return { isValid: false, error: prospectError };
  }

  const start = truncateToMinute(new Date(startTime));
  const end = truncateToMinute(new Date(endTime));

  if (start >= end) {
    return {
      isValid: false,
      error: "Время окончания должно быть позже времени начала",
    };
  }

  if (price && price < 0) {
    return {
      isValid: false,
      error: "Цена должна быть положительной",
    };
  }

  if (data.isTaxExempt !== undefined && typeof data.isTaxExempt !== "boolean") {
    return { isValid: false, error: TAX_EXEMPT_INVALID_ERROR };
  }

  return { isValid: true };
};
