import type { ReminderSettingsDto } from "../../types";

const VALID_INTERVALS = [5, 10, 15, 30, 60];

export const validateSettingsData = (
  data: ReminderSettingsDto
): { isValid: true } | { isValid: false; error: string } => {
  if (data.intervals !== undefined) {
    if (!Array.isArray(data.intervals)) {
      return { isValid: false, error: "Интервалы должны быть массивом" };
    }

    for (const interval of data.intervals) {
      if (!VALID_INTERVALS.includes(interval)) {
        return {
          isValid: false,
          error: "Недопустимый интервал напоминания. Допустимые значения: 5, 10, 15, 30, 60 минут",
        };
      }
    }

    const uniqueIntervals = new Set(data.intervals);
    if (uniqueIntervals.size !== data.intervals.length) {
      return { isValid: false, error: "Такой интервал уже добавлен" };
    }
  }

  if (
    data.callNotificationsEnabled !== undefined &&
    typeof data.callNotificationsEnabled !== "boolean"
  ) {
    return { isValid: false, error: "Некорректное значение настройки уведомлений о звонках" };
  }

  return { isValid: true };
};
