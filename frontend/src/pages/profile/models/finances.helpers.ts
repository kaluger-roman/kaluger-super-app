import type { TaxRatePeriod } from "@shared";

export const NO_PERIODS_ERROR =
  "Чтобы включить учёт налога, добавьте хотя бы один период";

export const isInvalidEnableAttempt = ({
  target,
  periods,
}: {
  target: boolean;
  periods: TaxRatePeriod[];
}): boolean => target === true && periods.length === 0;

export const extractFinancesErrorMessage = (error: unknown): string => {
  type AxiosLike = {
    response?: { data?: { error?: string } };
    message?: string;
  };
  const e = error as AxiosLike;
  return (
    e.response?.data?.error ||
    e.message ||
    "Не удалось обновить учёт налога"
  );
};
