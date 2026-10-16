import type { Prisma } from "@prisma/client";

export const INCOME_HISTORY_PAGE_SIZE = 50;

export const INCOME_HISTORY_LESSON_SELECT = {
  id: true,
  subject: true,
  lessonType: true,
  startTime: true,
  endTime: true,
  status: true,
  price: true,
  receivedAmount: true,
  paymentDate: true,
  isTaxExempt: true,
  prospectName: true,
  student: { select: { id: true, name: true, archived: true } },
} as const satisfies Prisma.LessonSelect;
