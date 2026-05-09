export const extractAxiosError = (error: unknown): string => {
  const axiosError = error as {
    response?: { data?: { error?: string } };
    message: string;
  };
  return axiosError?.response?.data?.error || axiosError?.message || "Ошибка при смене пароля";
};
