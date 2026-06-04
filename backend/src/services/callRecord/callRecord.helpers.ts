import type { CallStatus, CallerKind } from "@prisma/client";
import type { CallDirection, CallHistoryItem, CallStatusValue } from "../../types";

type CallRecordForView = {
  id: string;
  callerKind: CallerKind;
  status: CallStatus;
  startedAt: Date;
  durationSeconds: number | null;
  student: { name: string };
  tutor: { name: string };
};

const STATUS_TO_VALUE: Record<CallStatus, CallStatusValue> = {
  COMPLETED: "completed",
  MISSED: "missed",
  REJECTED: "rejected",
  CANCELED: "canceled",
  FAILED: "failed",
};

const directionFor = (
  callerKind: CallerKind,
  viewer: "tutor" | "student"
): CallDirection => {
  const initiatedByViewer =
    viewer === "tutor" ? callerKind === "TUTOR" : callerKind === "STUDENT";
  return initiatedByViewer ? "outgoing" : "incoming";
};

export const toCallHistoryItemForTutor = (
  record: CallRecordForView
): CallHistoryItem => ({
  id: record.id,
  peerName: record.student.name,
  direction: directionFor(record.callerKind, "tutor"),
  startedAt: record.startedAt.toISOString(),
  durationSeconds: record.durationSeconds,
  status: STATUS_TO_VALUE[record.status],
});

export const toCallHistoryItemForStudent = (
  record: CallRecordForView
): CallHistoryItem => ({
  id: record.id,
  peerName: record.tutor.name,
  direction: directionFor(record.callerKind, "student"),
  startedAt: record.startedAt.toISOString(),
  durationSeconds: record.durationSeconds,
  status: STATUS_TO_VALUE[record.status],
});
