import type { User } from "@shared";

export const isUserDefined = (user: User | null): user is User => user !== null;

export const getUserName = (user: User | null): string => user?.name ?? "";

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

export const PROFILE_SAVED_MESSAGE = "Профиль успешно обновлён";
