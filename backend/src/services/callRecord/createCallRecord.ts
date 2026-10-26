import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { toFinalizedTimes, toPrismaCallerKind } from "./callRecord.helpers";
import type { CreateCallRecordArgs } from "./callRecord.types";

// FOR SHARE holds the lesson row until the record is written, so a concurrent reassignment or
// deletion of the lesson waits and then unlinks the record (lessonUpdate / ON DELETE SET NULL).
// A lesson that already went to another student or was deleted is not linked at all. The student
// row is locked first, in the same order as the cascade of a student deletion, so the two cannot
// deadlock.
const lockRecordLessonId = async (
  tx: Prisma.TransactionClient,
  { tutorId, studentId, lessonId }: CreateCallRecordArgs
): Promise<string | null> => {
  if (lessonId === null) return null;
  await tx.$queryRaw`SELECT 1 FROM students WHERE id = ${studentId} FOR KEY SHARE`;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM lessons
    WHERE id = ${lessonId} AND "tutorId" = ${tutorId} AND "studentId" = ${studentId}
    FOR SHARE`;
  return rows[0]?.id ?? null;
};

export const createCallRecord = (args: CreateCallRecordArgs): Promise<void> =>
  prisma.$transaction(async (tx) => {
    const { tutorId, studentId, callerKind, status, startedAt, connectedAt } = args;
    await tx.callRecord.create({
      data: {
        tutorId,
        studentId,
        lessonId: await lockRecordLessonId(tx, args),
        callerKind: toPrismaCallerKind(callerKind),
        status,
        startedAt,
        ...toFinalizedTimes(status, connectedAt, new Date()),
      },
    });
  });
