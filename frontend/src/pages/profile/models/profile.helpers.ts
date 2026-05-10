import type { User } from "@shared";

export const isUserDefined = (user: User | null): user is User => user !== null;

export const getUserName = (user: User | null): string => user?.name ?? "";

export const PROFILE_SAVED_MESSAGE = "Профиль успешно обновлён";
