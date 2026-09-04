import { CreateLessonDto, ContactMethod } from "../../types";
import { truncateToMinute } from "../../utils/time";
import type { PrismaClient, Prisma } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export const CONTACT_METHODS: ContactMethod[] = ["WHATSAPP", "TELEGRAM", "MAX"];

const validateProspectFields = (data: CreateLessonDto): string | null => {
  const { studentId, prospectName, prospectPhone, prospectContactMethod } =
    data;

  if (studentId) {
    if (
      prospectName !== undefined ||
      prospectPhone !== undefined ||
      prospectContactMethod !== undefined
    ) {
      return "Данные пробного ученика нельзя указывать вместе с учеником";
    }
    return null;
  }

  if (prospectName === undefined) {
    return "Укажите ученика или имя для пробного урока без ученика";
  }

  if (!prospectName.trim()) {
    return "Имя ученика для пробного урока обязательно";
  }

  if (data.isRecurring) {
    return "Пробный урок без ученика не может быть повторяющимся";
  }

  if (
    prospectContactMethod !== undefined &&
    !CONTACT_METHODS.includes(prospectContactMethod)
  ) {
    return "Недопустимый способ связи (WhatsApp, Telegram или MAX)";
  }

  return null;
};

export const validateLessonData = (data: CreateLessonDto) => {
  const { subject, lessonType, startTime, endTime, price } = data;

  if (!subject || !lessonType || !startTime || !endTime) {
    return {
      isValid: false,
      error:
        "Предмет, тип урока, время начала и время окончания обязательны",
    };
  }

  const prospectError = validateProspectFields(data);
  if (prospectError) {
    return { isValid: false, error: prospectError };
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
  prisma: PrismaLike
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
