export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatDateShort = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return `${dateObj.toLocaleDateString("ru-RU")} ${dateObj.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export const formatMonth = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
};

export const formatDay = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

export const formatWeekRange = (start: Date | string, end: Date | string): string => {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const startFormatted = startDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  const endFormatted = endDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${startFormatted} — ${endFormatted}`;
};

// Низкоуровневые date-примитивы (addDays/getWeekStart/getWeekEnd/groupByDay,
// formatTime/formatDuration/formatTimeRange, toDateKey) живут в `date.helpers.ts`.
// Этот модуль содержит только локализованные форматтеры верхнего уровня.
