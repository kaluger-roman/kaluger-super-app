import { formatDay } from "@shared";

export const formatHistoryDayLabel = (dateKey: string): string => {
  const label = formatDay(new Date(`${dateKey}T00:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
};
