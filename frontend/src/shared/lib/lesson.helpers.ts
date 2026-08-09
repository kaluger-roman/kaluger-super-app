import type { Lesson } from "../types";

export const isProspectLesson = (lesson: Pick<Lesson, "studentId">): boolean =>
  !lesson.studentId;

export const getLessonDisplayName = (
  lesson: Pick<Lesson, "student" | "prospectName">
): string => lesson.student?.name ?? lesson.prospectName ?? "";

export const getStatusLabel = (status: Lesson["status"]): string => {
  switch (status) {
    case "SCHEDULED":
      return "Запланирован";
    case "COMPLETED":
      return "Завершен";
    case "CANCELLED":
      return "Отменен";
    case "RESCHEDULED":
      return "Перенесен";
    case "IN_PROGRESS":
      return "В процессе";
    default:
      return "";
  }
};

export const getStatusColor = (status: Lesson["status"]) => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    case "RESCHEDULED":
      return "warning";
    case "IN_PROGRESS":
      return "info";
    default:
      return "default";
  }
};

export const formatLessonTime = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleDateString("ru-RU")} ${start.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export const formatTimeForCell = (date: Date): string => {
  return date.toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTimeFromString = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateTimeLong = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
