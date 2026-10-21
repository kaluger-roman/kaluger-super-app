import { prisma } from "../../lib/prisma";
import { toFinalizedTimes, toPrismaCallerKind } from "./callRecord.helpers";
import type { CreateCallRecordArgs } from "./callRecord.types";

export const createCallRecord = async ({
  tutorId,
  studentId,
  callerKind,
  status,
  startedAt,
  connectedAt,
}: CreateCallRecordArgs): Promise<void> => {
  await prisma.callRecord.create({
    data: {
      tutorId,
      studentId,
      callerKind: toPrismaCallerKind(callerKind),
      status,
      startedAt,
      ...toFinalizedTimes(status, connectedAt, new Date()),
    },
  });
};
