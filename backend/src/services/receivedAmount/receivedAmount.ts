import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CronScope } from "../../types";

// The backfill migration runs before pm2 restarts the backend, so the old process can
// still mark or unmark payments without knowing receivedAmount. Run once on startup to
// restore the invariant isPaid <=> receivedAmount IS NOT NULL; idempotent.
export const reconcileReceivedAmounts = async (scope?: CronScope) => {
  if (scope && scope.tutorIds.length === 0) return { filled: 0, cleared: 0 };

  const scopeSql = scope
    ? Prisma.sql`AND "tutorId" IN (${Prisma.join(scope.tutorIds)})`
    : Prisma.empty;
  const scopeWhere = scope ? { tutorId: { in: scope.tutorIds } } : {};

  const [filled, cleared] = await prisma.$transaction([
    prisma.$executeRaw`UPDATE "lessons" SET "receivedAmount" = COALESCE("price", 0) WHERE "isPaid" = true AND "receivedAmount" IS NULL ${scopeSql}`,
    prisma.lesson.updateMany({
      where: { ...scopeWhere, isPaid: false, receivedAmount: { not: null } },
      data: { receivedAmount: null },
    }),
  ]);

  return { filled, cleared: cleared.count };
};
