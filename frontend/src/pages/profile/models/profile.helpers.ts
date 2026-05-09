import type { TaxRatePeriod, User } from "@shared";

export const isUserDefined = (user: User | null): user is User => user !== null;

export const getUserName = (user: User | null): string => user?.name ?? "";

export const getUserTaxEnabled = (user: User | null): boolean =>
  user?.taxEnabled ?? false;

export const isTaxEnabledWithoutPeriods = ({
  taxEnabled,
  periods,
}: {
  taxEnabled: boolean;
  periods: TaxRatePeriod[];
}): boolean => taxEnabled && periods.length === 0;

export const buildUpdateProfilePayload = ({
  name,
  taxEnabled,
}: {
  name: string;
  taxEnabled: boolean;
  periods: TaxRatePeriod[];
}): { name: string; taxEnabled: boolean } => ({ name, taxEnabled });

export const extractProfileErrorMessage = (error: unknown): string => {
  type AxiosLike = {
    response?: { data?: { error?: string } };
    message?: string;
  };
  const e = error as AxiosLike;
  return (
    e.response?.data?.error || e.message || "Не удалось обновить профиль"
  );
};

export const NO_PERIODS_ERROR =
  "Чтобы включить учёт налога, добавьте хотя бы один период";

export const PROFILE_SAVED_MESSAGE = "Профиль успешно обновлён";
