import type { Lesson } from "@prisma/client";
import type { UpdateLessonDto } from "../../types";
import { truncateToMinute } from "../../utils/time";
import { CONTACT_METHODS } from "./validators";

export const validateUpdateData = (
  updateData: UpdateLessonDto,
  existingLesson: Lesson,
) => {
  if (updateData.startTime || updateData.endTime) {
    if (existingLesson.status === "CANCELLED") {
      return {
        isValid: false,
        error:
          "Невозможно перенести отменённый урок. Сначала восстановите урок",
        statusCode: 400,
      };
    }
    const start = updateData.startTime
      ? truncateToMinute(new Date(updateData.startTime))
      : existingLesson.startTime;
    const end = updateData.endTime
      ? truncateToMinute(new Date(updateData.endTime))
      : existingLesson.endTime;

    if (start >= end) {
      return {
        isValid: false,
        error: "Время окончания должно быть позже времени начала",
      };
    }
  }

  if (updateData.price && updateData.price < 0) {
    return { isValid: false, error: "Цена должна быть положительной" };
  }

  if (updateData.grade && (updateData.grade < 1 || updateData.grade > 5)) {
    return { isValid: false, error: "Оценка должна быть от 1 до 5" };
  }

  if ("studentId" in updateData && !updateData.studentId) {
    return { isValid: false, error: "Нельзя отвязать ученика от урока" };
  }

  const hasProspectFields =
    "prospectName" in updateData ||
    "prospectPhone" in updateData ||
    "prospectContactMethod" in updateData;

  if (hasProspectFields && (existingLesson.studentId || updateData.studentId)) {
    return {
      isValid: false,
      error: "Данные пробного ученика нельзя указывать вместе с учеником",
    };
  }

  if ("prospectName" in updateData && !updateData.prospectName?.trim()) {
    return {
      isValid: false,
      error: "Имя ученика для пробного урока обязательно",
    };
  }

  if (
    updateData.prospectContactMethod !== undefined &&
    !CONTACT_METHODS.includes(updateData.prospectContactMethod)
  ) {
    return {
      isValid: false,
      error: "Недопустимый способ связи (WhatsApp, Telegram или MAX)",
    };
  }

  if (
    updateData.isRecurring &&
    !existingLesson.studentId &&
    !updateData.studentId
  ) {
    return {
      isValid: false,
      error: "Пробный урок без ученика не может быть повторяющимся",
    };
  }

  return { isValid: true };
};
