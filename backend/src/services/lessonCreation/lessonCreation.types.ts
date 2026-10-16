import type { Lesson, Prisma, PrismaClient, Student } from "@prisma/client";

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type LessonWithStudent = Lesson & { student: Student | null };

export type RecurringSlot = {
  start: Date;
  end: Date;
  isFirst: boolean;
};

export type CreatedRecurringLessons = {
  created: Lesson[];
  first: LessonWithStudent | null;
};
