import type { Lesson, Prisma, PrismaClient } from "@prisma/client";
import type { LESSON_STUDENT_INCLUDE } from "../lessonsQuery";

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type LessonWithStudent = Prisma.LessonGetPayload<{ include: typeof LESSON_STUDENT_INCLUDE }>;

export type RecurringSlot = {
  start: Date;
  end: Date;
  isFirst: boolean;
};

export type CreatedRecurringLessons = {
  created: Lesson[];
  first: LessonWithStudent | null;
};
