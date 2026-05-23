import type { StudentVisibleLesson } from "@shared";
import {
  addDays,
  formatDuration,
  formatTime,
  formatWeekRange,
  getWeekStart,
  groupByDay,
  toDateKey,
} from "@shared";

// Re-export generic date primitives — реализация в @shared/lib/date.helpers
// (см. docs/conventions/frontend.md → "Date formatting").
export { addDays, getWeekStart };
export const toIsoDate = toDateKey;

// "4 мая — 10 мая 2026" над shared/formatWeekRange — вычисляет endDay сам.
export const formatRangeLabel = (weekStart: Date | string): string =>
  formatWeekRange(weekStart, addDays(weekStart, 6));

export const groupLessonsByDay = (
  lessons: StudentVisibleLesson[]
): Record<string, StudentVisibleLesson[]> =>
  groupByDay(lessons, (lesson) => lesson.startTime);

export const formatLessonTime = formatTime;
export const formatLessonDuration = formatDuration;

export const subjectLabel = (
  subject: StudentVisibleLesson["subject"]
): string => (subject === "MATHEMATICS" ? "Математика" : "Физика");

export const statusLabel = (
  status: StudentVisibleLesson["status"]
): string => {
  switch (status) {
    case "SCHEDULED":
      return "Запланирован";
    case "COMPLETED":
      return "Завершён";
    case "CANCELLED":
      return "Отменён";
    case "RESCHEDULED":
      return "Перенесён";
    case "IN_PROGRESS":
      return "Идёт сейчас";
    default:
      return status;
  }
};
