import { CreateLessonDto } from "../../types";
import { truncateToMinute } from "../../utils/time";

export const validateLessonData = (data: CreateLessonDto) => {
  const { subject, lessonType, startTime, endTime, studentId, price } = data;

  if (!subject || !lessonType || !startTime || !endTime || !studentId) {
    return {
      isValid: false,
      error:
        "Предмет, тип урока, время начала, время окончания и ID студента обязательны",
    };
  }

  const start = truncateToMinute(new Date(startTime));
  const end = truncateToMinute(new Date(endTime));

  if (start >= end) {
    return {
      isValid: false,
      error: "Время окончания должно быть позже времени начала",
    };
  }

  if (price && price < 0) {
    return {
      isValid: false,
      error: "Цена должна быть положительной",
    };
  }

  return { isValid: true };
};

export const checkSchedulingConflicts = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  prisma: any
) => {
  return prisma.lesson.findMany({
    where: {
      tutorId: userId,
      status: {
        not: "CANCELLED",
      },
      OR: [
        {
          startTime: {
            lt: endTime,
          },
          endTime: {
            gt: startTime,
          },
        },
      ],
    },
  });
};
