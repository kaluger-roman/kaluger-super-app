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

