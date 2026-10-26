import type { CallHistoryDirection, CallHistoryStatus, CallLessonSummary } from "@entities";
import { SUBJECT_LABELS, formatDay, formatTimeRange } from "@shared";

import { CALL_STATUS_LABELS, OUTGOING_UNANSWERED_LABEL } from "./videoCall.constants";

export const formatCallLessonSubject = (lesson: CallLessonSummary): string =>
  SUBJECT_LABELS[lesson.subject];

export const formatCallLessonTime = (lesson: CallLessonSummary): string =>
  `${formatDay(lesson.startTime)} · ${formatTimeRange(lesson.startTime, lesson.endTime)}`;

export const formatCallLesson = (lesson: CallLessonSummary): string =>
  `${formatCallLessonSubject(lesson)} · ${formatCallLessonTime(lesson)}`;

export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const formatCallDuration = (seconds: number | null): string => {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const paddedSeconds = rest.toString().padStart(2, "0");
  if (minutes < 60) {
    return `${minutes}:${paddedSeconds}`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${restMinutes}:${paddedSeconds}`;
};

// "Пропущен" belongs to the side that did not answer; the caller just got no answer.
export const getCallStatusLabel = (
  status: CallHistoryStatus,
  direction: CallHistoryDirection
): string =>
  status === "MISSED" && direction === "outgoing"
    ? OUTGOING_UNANSWERED_LABEL
    : CALL_STATUS_LABELS[status];

export const getCallDirectionLabel = (direction: CallHistoryDirection): string =>
  direction === "outgoing" ? "Исходящий" : "Входящий";
