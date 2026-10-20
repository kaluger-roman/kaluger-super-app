import { prisma } from "../../lib/prisma";
import { computeDurationSeconds } from "./callSignaling.helpers";
import type { CreateFinalizedCallRecordArgs } from "./callSignaling.types";

export const createFinalizedCallRecord = async ({
  tutorId,
  studentId,
  callerKind,
  status,
  startedAt,
  endedAt,
  connectedAt,
}: CreateFinalizedCallRecordArgs): Promise<void> => {
  try {
    const durationSeconds = computeDurationSeconds(status, connectedAt, endedAt);
    await prisma.callRecord.create({
      data: {
        tutorId,
        studentId,
        callerKind: callerKind === "tutor" ? "TUTOR" : "STUDENT",
        status,
        startedAt,
        endedAt: status === "COMPLETED" ? (endedAt ?? null) : null,
        durationSeconds,
      },
    });
  } catch (error) {
    console.error("createFinalizedCallRecord failed:", error);
  }
};
