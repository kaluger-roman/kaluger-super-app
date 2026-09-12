import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { LessonsPageOptions, PaymentsSummary } from "./lessonsQuery.types";

export const fetchLessonsPage = async (
  where: Prisma.LessonWhereInput,
  { orderAsc, pagination, withPaymentsSummary }: LessonsPageOptions
) => {
  const [lessons, total, paymentsAggregate] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include: { student: true },
      orderBy: { startTime: orderAsc ? "asc" : "desc" },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    }),
    prisma.lesson.count({ where }),
    withPaymentsSummary
      ? prisma.lesson.aggregate({
          where: { ...where, isPaid: true, price: { gt: 0 } },
          _sum: { price: true },
          _count: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const paymentsSummary: PaymentsSummary | null = paymentsAggregate
    ? {
        sum: paymentsAggregate._sum.price?.toNumber() ?? 0,
        count: paymentsAggregate._count.id || 0,
      }
    : null;

  return { lessons, total, paymentsSummary };
};
