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

export const formatDuration = (startTime: string | Date, endTime: string | Date): string => {
  try {
    const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
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

export const toDateKey = (date?: Date | string | null): string => {
  try {
    if (!date) return "";
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    // YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

// Pure, mutation-free date primitives. Все принимают Date | string и
// возвращают новый Date — вход никогда не мутируют.

const toDateSafe = (value: Date | string): Date =>
  typeof value === "string" ? new Date(value) : new Date(value);

export const addDays = (date: Date | string, days: number): Date => {
  const result = toDateSafe(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Понедельник 00:00 локального дня (ISO-8601 неделя).
export const getWeekStart = (date: Date | string): Date => {
  const source = toDateSafe(date);
  const start = new Date(
    source.getFullYear(),
    source.getMonth(),
    source.getDate()
  );
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
};

// Воскресенье 23:59:59.999 локального дня той же недели — для inclusive
// фильтров (например, payment-date "currentWeek" preset).
export const getWeekEnd = (date: Date | string): Date => {
  const sunday = addDays(getWeekStart(date), 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

// "10:00—11:00" — formatTime пара через em-dash.
export const formatTimeRange = (
  start: Date | string,
  end: Date | string
): string => `${formatTime(start)}—${formatTime(end)}`;

// Группировка списка по локальному дню. Ключ — локализованная строка вида
// "среда, 6 мая 2026 г.". Внутри каждой группы — сортировка по startTime.
// Используется и в репетиторском WeeklyView, и в ученическом StudentWeeklyView.
export const groupByDay = <T>(
  items: T[],
  getStart: (item: T) => Date | string
): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const startDate = toDateSafe(getStart(item));
    const dayKey = startDate.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(item);
  }
  for (const dayItems of Object.values(groups)) {
    dayItems.sort(
      (a, b) =>
        toDateSafe(getStart(a)).getTime() -
        toDateSafe(getStart(b)).getTime()
    );
  }
  return groups;
};
