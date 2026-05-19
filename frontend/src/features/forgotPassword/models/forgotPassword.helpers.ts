import { extractAxiosError as extractAxiosErrorShared } from "@shared";

export const extractAxiosError = (error: unknown): string =>
  extractAxiosErrorShared(
    error,
    "Не удалось отправить запрос. Попробуйте позже"
  );
