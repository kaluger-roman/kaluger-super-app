const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const INCOME_HISTORY_PERIOD_ERROR = "Некорректный период";
export const INCOME_HISTORY_CURSOR_ERROR = "Некорректная позиция продолжения истории";

const isOptionalDate = (value: unknown) =>
  value === undefined ||
  value === "" ||
  (typeof value === "string" && !Number.isNaN(new Date(value).getTime()));

const isOptionalDayKey = (value: unknown) =>
  value === undefined || (typeof value === "string" && DAY_KEY_PATTERN.test(value));

export const validateIncomeHistoryQuery = (query: Record<string, unknown>): string | null => {
  if (!isOptionalDate(query.startDate) || !isOptionalDate(query.endDate)) {
    return INCOME_HISTORY_PERIOD_ERROR;
  }
  if (!isOptionalDayKey(query.before) || !isOptionalDayKey(query.through)) {
    return INCOME_HISTORY_CURSOR_ERROR;
  }
  if (query.before !== undefined && query.through !== undefined) {
    return INCOME_HISTORY_CURSOR_ERROR;
  }
  return null;
};
