import type { CallerKind, CallStatus } from "@prisma/client";
import type { CallerKindValue, CallHistoryItem } from "../../types";
import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT } from "./callRecord.constants";
import type { CallRecordWithPeer, FinalizedTimes } from "./callRecord.types";

export const toPrismaCallerKind = (kind: CallerKindValue): CallerKind =>
  kind === "tutor" ? "TUTOR" : "STUDENT";

export const toCallHistoryItem = (
  record: CallRecordWithPeer,
  viewer: CallerKindValue
): CallHistoryItem => ({
  id: record.id,
  peerName: viewer === "tutor" ? record.student.name : record.tutor.name,
  direction: record.callerKind === toPrismaCallerKind(viewer) ? "outgoing" : "incoming",
  startedAt: record.startedAt.toISOString(),
  durationSeconds: record.durationSeconds,
  status: record.status,
});

// Only a completed call has an end and a duration; every other outcome never connected.
export const toFinalizedTimes = (
  status: CallStatus,
  connectedAt: Date | undefined,
  endedAt: Date
): FinalizedTimes => {
  if (status !== "COMPLETED") return { endedAt: null, durationSeconds: null };
  const durationSeconds = connectedAt
    ? Math.max(0, Math.floor((endedAt.getTime() - connectedAt.getTime()) / 1000))
    : null;
  return { endedAt, durationSeconds };
};

export const clampLimit = (limit?: number): number => {
  if (!limit || limit <= 0) return DEFAULT_HISTORY_LIMIT;
  return Math.min(limit, MAX_HISTORY_LIMIT);
};
