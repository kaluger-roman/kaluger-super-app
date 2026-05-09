import type { CreateTaxRatePeriodDto } from "../../types";

const validateRate = (rate: unknown): string | null => {
  if (typeof rate !== "number" || Number.isNaN(rate)) {
    return "Ставка налога должна быть числом";
  }
  if (rate < 0 || rate > 100) {
    return "Ставка налога должна быть от 0 до 100";
  }
  return null;
};

const validateStartDate = (startDate: unknown): string | null => {
  if (typeof startDate !== "string" || startDate.length === 0) {
    return "Не указана дата начала периода";
  }
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    return "Некорректная дата начала периода";
  }
  return null;
};

export const validateTaxPeriodInput = (
  data: CreateTaxRatePeriodDto,
): string | null => {
  const rateError = validateRate(data.rate);
  if (rateError) return rateError;
  const dateError = validateStartDate(data.startDate);
  if (dateError) return dateError;
  return null;
};

export const hasDuplicateStartDates = (
  periods: { startDate: string }[],
): boolean => new Set(periods.map((p) => p.startDate)).size !== periods.length;

export const normalizeRate = (rate: number): number =>
  Math.round(rate * 10) / 10;
