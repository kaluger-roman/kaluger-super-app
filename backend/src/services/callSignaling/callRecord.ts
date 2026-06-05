import prisma from "../../lib/prisma";
import type { CallerKindValue } from "../../types";
import type { CallFinalizeStatus } from "./callSignaling.types";

type CreateFinalizedCallRecordArgs = {
  tutorId: string;
  studentId: string;
  callerKind: CallerKindValue;
  status: CallFinalizeStatus;
  startedAt: Date;
  endedAt?: Date;
  connectedAt?: Date;
};

const computeDurationSeconds = (
  status: CallFinalizeStatus,
  connectedAt?: Date,
  endedAt?: Date
): number | null => {
  if (status !== "COMPLETED" || !connectedAt || !endedAt) return null;
  return Math.max(0, Math.floor((endedAt.getTime() - connectedAt.getTime()) / 1000));
};

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
        endedAt: status === "COMPLETED" ? endedAt ?? null : null,
        durationSeconds,
      },
    });
  } catch (error) {
    console.error("createFinalizedCallRecord failed:", error);
  }
};
