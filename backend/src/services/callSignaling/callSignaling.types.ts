import type { CallStatus } from "@prisma/client";
import type { CallerKindValue } from "../../types";

export type ResolvedPair = {
  tutorUserId: string;
  studentUserId: string;
  studentId: string;
  studentName: string;
  tutorName: string;
};

export type LiveCallStatus = "ringing" | "accepted" | "connected";

export type LiveCall = {
  callId: string;
  callerKind: CallerKindValue;
  tutorUserId: string;
  studentUserId: string;
  studentId: string;
  studentName: string;
  tutorName: string;
  status: LiveCallStatus;
  startedAt: Date;
  connectedAt?: Date;
  ringTimeout?: ReturnType<typeof setTimeout>;
};

export type CallFinalizeStatus = CallStatus;

export type CallParticipant = {
  kind: CallerKindValue;
  id: string;
};

export type CallDropOutcome = {
  status: CallFinalizeStatus;
  peerMessage: "call_ended" | "call_canceled" | "call_unavailable";
};

export type CreateFinalizedCallRecordArgs = {
  tutorId: string;
  studentId: string;
  callerKind: CallerKindValue;
  status: CallFinalizeStatus;
  startedAt: Date;
  endedAt?: Date;
  connectedAt?: Date;
};
