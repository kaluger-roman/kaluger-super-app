export { extractAxiosError } from "@shared";

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
