import type { AxiosError } from "axios";

type ApiErrorBody = { error?: string };

// Backend always serialises errors as `{ error: "..." }` in Russian. axios'
// `error.message` is the underlying English string ("Network Error") and is
// not user-facing — we deliberately fall back to the caller's Russian string
// instead.
export const extractAxiosError = (
  err: unknown,
  fallback = "Произошла ошибка. Попробуйте позже"
): string => {
  const axiosError = err as AxiosError<ApiErrorBody>;
  return axiosError?.response?.data?.error || fallback;
};
