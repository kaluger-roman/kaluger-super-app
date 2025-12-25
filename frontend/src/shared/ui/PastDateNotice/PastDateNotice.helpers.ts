import type { Lesson } from "../../types";

type LessonStatus = "COMPLETED" | "IN_PROGRESS" | "SCHEDULED";

export const calculateLessonStatus = (startTime: Date, endTime: Date): LessonStatus => {
  const now = Date.now();
  const start = startTime.getTime();
  const end = endTime.getTime();

  if (end < now) {
    return "COMPLETED";
  }
  if (start <= now && end >= now) {
    return "IN_PROGRESS";
  }
  return "SCHEDULED";
};

export const shouldShowNotice = (
  startTime: Date,
  endTime: Date,
  lesson?: Lesson
): { visible: boolean; message: string } => {
  try {
    const statusCode = calculateLessonStatus(startTime, endTime);

    if (lesson && lesson.status === statusCode) {
      return { visible: false, message: "" };
    }

    if (statusCode === "COMPLETED") {
      return {
        visible: true,
        message:
          "Внимание: время окончания урока уже прошло. Урок будет автоматически отмечен как завершенный.",
      };
    }

    if (statusCode === "IN_PROGRESS") {
      return {
        visible: true,
        message:
          "Внимание: время начала урока уже наступило. Урок будет автоматически отмечен как идущий.",
      };
    }

    return { visible: false, message: "" };
  } catch (error) {
    console.error("Error in shouldShowNotice:", error);
    return { visible: false, message: "" };
  }
};
