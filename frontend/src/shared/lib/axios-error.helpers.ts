import type { AxiosLikeError } from "./axios-error.types";

// Returns the server-provided Russian error from axios `response.data.error`
// or the caller-supplied Russian fallback. Skips `error.message` deliberately —
// network/timeout errors there are usually English and not user-friendly.
export const extractAxiosErrorMessage = (error: unknown, fallback: string): string => {
  const e = error as AxiosLikeError;
  return e?.response?.data?.error || fallback;
};
