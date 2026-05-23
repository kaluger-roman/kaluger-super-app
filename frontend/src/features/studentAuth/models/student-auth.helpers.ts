// Тонкая обёртка над shared/extractAxiosError, чтобы импорт оставался один.
export { extractAxiosError } from "@shared";

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidPassword = (password: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(password);

export const isValidName = (name: string): boolean =>
  name.trim().length > 0 && name.trim().length <= 200;
