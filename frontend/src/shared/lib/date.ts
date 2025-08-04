import { format, parseISO, isValid } from "date-fns";

export const formatDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "dd.MM.yyyy");
  } catch {
    return "";
  }
};

export const formatDateTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "dd.MM.yyyy HH:mm");
  } catch {
    return "";
  }
};

export const formatTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "HH:mm");
  } catch {
    return "";
  }
};

export const formatDuration = (
  startTime: string | Date,
  endTime: string | Date
): string => {
  try {
    const start =
      typeof startTime === "string" ? parseISO(startTime) : startTime;
    const end = typeof endTime === "string" ? parseISO(endTime) : endTime;

    if (!isValid(start) || !isValid(end)) return "";

    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}ч ${minutes}мин`;
    }
    return `${minutes}мин`;
  } catch {
    return "";
  }
};
