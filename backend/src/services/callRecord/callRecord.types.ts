import type { CallStatus, Prisma } from "@prisma/client";
import type { CallerKindValue } from "../../types";
import type { CALL_RECORD_WITH_PEER } from "./callRecord.constants";

export type CallHistoryQuery = {
  limit?: number;
};

export type CallRecordWithPeer = Prisma.CallRecordGetPayload<typeof CALL_RECORD_WITH_PEER>;

export type CreateCallRecordArgs = {
  tutorId: string;
  studentId: string;
  callerKind: CallerKindValue;
  status: CallStatus;
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
};

export type FinalizedTimes = {
  endedAt: Date | null;
  durationSeconds: number | null;
};
