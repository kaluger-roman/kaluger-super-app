import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { tryAttachCommissionToLessons } from "../commission";
import { LESSON_STUDENT_INCLUDE } from "./lessonsQuery.constants";
import type { LessonsPageOptions, PaymentsSummary } from "./lessonsQuery.types";

export const fetchLessonsPage = async (
  where: Prisma.LessonWhereInput,
  { tutorId, orderAsc, pagination, withPaymentsSummary }: LessonsPageOptions
) => {
  const [lessons, total, paymentsAggregate] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include: LESSON_STUDENT_INCLUDE,
      orderBy: { startTime: orderAsc ? "asc" : "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    }),
    prisma.lesson.count({ where }),
    withPaymentsSummary
      ? prisma.lesson.aggregate({
          where: { ...where, isPaid: true, receivedAmount: { gt: 0 } },
          _sum: { receivedAmount: true },
          _count: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const paymentsSummary: PaymentsSummary | null = paymentsAggregate
    ? {
        sum: paymentsAggregate._sum.receivedAmount?.toNumber() ?? 0,
        count: paymentsAggregate._count.id || 0,
      }
    : null;

  return {
    lessons: await tryAttachCommissionToLessons(tutorId, lessons),
    total,
    paymentsSummary,
  };
};
