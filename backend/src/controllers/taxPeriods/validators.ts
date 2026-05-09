import type {
  CreateTaxRatePeriodDto,
  UpdateTaxRatePeriodDto,
} from "../../types";

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

export const validateCreateTaxPeriod = (
  data: CreateTaxRatePeriodDto,
): string[] => {
  const errors: string[] = [];
  const rateError = validateRate(data.rate);
  if (rateError) errors.push(rateError);
  const dateError = validateStartDate(data.startDate);
  if (dateError) errors.push(dateError);
  return errors;
};

export const validateUpdateTaxPeriod = (
  data: UpdateTaxRatePeriodDto,
): string[] => {
  const errors: string[] = [];
  if (!("rate" in data) && !("startDate" in data)) {
    errors.push("Передайте хотя бы одно поле для обновления");
    return errors;
  }
  if ("rate" in data && data.rate !== undefined) {
    const rateError = validateRate(data.rate);
    if (rateError) errors.push(rateError);
  }
  if ("startDate" in data && data.startDate !== undefined) {
    const dateError = validateStartDate(data.startDate);
    if (dateError) errors.push(dateError);
  }
  return errors;
};

export const normalizeRate = (rate: number): number =>
  Math.round(rate * 10) / 10;
