import type { CallStatus } from "@prisma/client";
import type { CallLesson } from "../callRecord";
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
  lesson: CallLesson | null;
  status: LiveCallStatus;
  startedAt: Date;
  connectedAt?: Date;
  ringTimeout?: ReturnType<typeof setTimeout>;
};

export type CallParticipant = {
  kind: CallerKindValue;
  id: string;
};

export type CallDropOutcome = {
  status: CallStatus;
  peerMessage: "call_ended" | "call_canceled" | "call_unavailable";
};
