import type { CallerKind } from "@prisma/client";
import type { CallDirection, CallHistoryItem } from "../../types";
import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT, STATUS_TO_VALUE } from "./callRecord.constants";
import type { CallRecordWithPeer } from "./callRecord.types";

const directionFor = (callerKind: CallerKind, viewer: "tutor" | "student"): CallDirection => {
  const initiatedByViewer = viewer === "tutor" ? callerKind === "TUTOR" : callerKind === "STUDENT";
  return initiatedByViewer ? "outgoing" : "incoming";
};

export const toCallHistoryItemForTutor = (record: CallRecordWithPeer): CallHistoryItem => ({
  id: record.id,
  peerName: record.student.name,
  direction: directionFor(record.callerKind, "tutor"),
  startedAt: record.startedAt.toISOString(),
  durationSeconds: record.durationSeconds,
  status: STATUS_TO_VALUE[record.status],
});

export const toCallHistoryItemForStudent = (record: CallRecordWithPeer): CallHistoryItem => ({
  id: record.id,
  peerName: record.tutor.name,
  direction: directionFor(record.callerKind, "student"),
  startedAt: record.startedAt.toISOString(),
  durationSeconds: record.durationSeconds,
  status: STATUS_TO_VALUE[record.status],
});

export const clampLimit = (limit?: number): number => {
  if (!limit || limit <= 0) return DEFAULT_HISTORY_LIMIT;
  return Math.min(limit, MAX_HISTORY_LIMIT);
};
