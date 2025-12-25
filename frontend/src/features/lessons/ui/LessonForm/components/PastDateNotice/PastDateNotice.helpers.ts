import type { Lesson } from "@shared";

type LessonStatus = "COMPLETED" | "IN_PROGRESS" | "SCHEDULED";

const STATUS_LABELS: Record<LessonStatus, string> = {
  COMPLETED: "Завершён",
  IN_PROGRESS: "Идёт сейчас",
  SCHEDULED: "Запланирован",
};

const calculateLessonStatus = (startTime: Date, endTime: Date): LessonStatus => {
  const now = Date.now();
  const start = startTime.getTime();
  const end = endTime.getTime();

  if (end < now) {
    return "COMPLETED";
  }
  if (start <= now && end > now) {
    return "IN_PROGRESS";
  }
  return "SCHEDULED";
};

export const getPastDateNoticeMessage = (
  startTime: Date,
  endTime: Date,
  lesson?: Lesson
): string | null => {
  try {
    const now = Date.now();
    const start = startTime.getTime();

    if (start >= now || lesson?.status === "COMPLETED") {
      return null;
    }

    const statusCode = calculateLessonStatus(startTime, endTime);
    const statusLabel = STATUS_LABELS[statusCode];

    return `Согласно указанной дате после сохранения статус будет '${statusLabel}'.`;
  } catch (err) {
    return null;
  }
};
