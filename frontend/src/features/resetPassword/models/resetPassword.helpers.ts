import type { TokenStatus } from "./resetPassword.types";

export const extractAxiosError = (error: unknown): string => {
  const axiosError = error as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return (
    axiosError?.response?.data?.error ||
    axiosError?.message ||
    "Не удалось сменить пароль. Попробуйте позже"
  );
};

const getResponseError = (error: unknown): string | undefined => {
  const axiosError = error as {
    response?: { data?: { error?: string } };
  };
  return axiosError?.response?.data?.error;
};

export const mapVerifyTokenError = (
  error: unknown,
): { status: Exclude<TokenStatus, "idle" | "checking" | "valid">; message: string } => {
  const message = getResponseError(error) ?? "Ссылка для сброса пароля недействительна";
  if (message.includes("истёк")) {
    return { status: "invalid_expired", message };
  }
  if (message.includes("использована")) {
    return { status: "invalid_used", message };
  }
  return { status: "invalid_unknown", message };
};
