export const extractAxiosError = (error: unknown): string => {
  const axiosError = error as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return (
    axiosError?.response?.data?.error ||
    axiosError?.message ||
    "Не удалось отправить запрос. Попробуйте позже"
  );
};
