import type { AxiosError } from "axios";

type ApiErrorBody = { error?: string };

// Унифицированная экстракция текста ошибки из axios-ошибки.
// Конвенция: backend возвращает `{ error: "..." }` на любых не-2xx ответах,
// поэтому в первую очередь читаем `response.data.error`, затем — общий `message`.
// Фолбэк-строку можно переопределить (например, для admin-форм).
export const extractAxiosError = (
  err: unknown,
  fallback = "Произошла ошибка. Попробуйте позже"
): string => {
  const axiosError = err as AxiosError<ApiErrorBody>;
  return (
    axiosError?.response?.data?.error ||
    axiosError?.message ||
    fallback
  );
};
