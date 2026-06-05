import type { CallerKindValue } from "../../types";

export type ResolvedPair = {
  tutorUserId: string;
  studentUserId: string;
  studentId: string;
  studentName: string;
  tutorName: string;
};

export type LiveCallStatus = "ringing" | "connected";

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

export type CallFinalizeStatus =
  | "COMPLETED"
  | "MISSED"
  | "REJECTED"
  | "CANCELED"
  | "FAILED";
