import {
  LESSON_TYPE_LABELS,
  SUBJECT_LABELS,
  formatTimeRange,
  getStatusColor,
  getStatusLabel,
} from "@shared";
import type { IncomeHistoryEntry, LessonStatus } from "@shared";

export const getEntryName = (entry: IncomeHistoryEntry): string =>
  entry.student?.name ?? entry.prospectName ?? "";

export const formatEntryLessonLine = (entry: IncomeHistoryEntry): string => {
  const date = new Date(entry.lessonStartTime).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const time = formatTimeRange(entry.lessonStartTime, entry.lessonEndTime);
  return `${SUBJECT_LABELS[entry.subject]} · ${LESSON_TYPE_LABELS[entry.lessonType]} · урок ${date}, ${time}`;
};

export const getEntryStatusLabel = (status: LessonStatus): string =>
  status === "SCHEDULED" ? "Предстоящий" : getStatusLabel(status);

export const getEntryStatusColor = (status: LessonStatus) =>
  status === "SCHEDULED" ? "info" : getStatusColor(status);
