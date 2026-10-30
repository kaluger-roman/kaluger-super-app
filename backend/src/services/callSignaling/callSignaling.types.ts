import type { CallStatus } from "@prisma/client";
import type { CallLesson } from "../callRecord";
import type { CallerKindValue, PresenceState } from "../../types";

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
  tutorName: string;
  studentName: string;
  // A participant without a key is connected; one with a key lost the connection at that moment.
  disconnectedAt: Partial<Record<CallerKindValue, Date>>;
  // The page (tab id) that held the call when its participant lost the connection: while the call
  // waits, only that page's automatic reconnect takes the connection from another live page. No key:
  // that page sent no id.
  disconnectedTabId: Partial<Record<CallerKindValue, string>>;
  graceTimers: Partial<Record<CallerKindValue, ReturnType<typeof setTimeout>>>;
  // The participant has to rebuild its connection for its peer's session restart. The value is the
  // connection the request was written to (null: it had none) until a signal over that connection
  // proves it delivered; a call_resume over another connection gets the request again.
  pendingPeerRestart: Partial<Record<CallerKindValue, object | null>>;
  // The callee was told about the call by a push notification (it needs a closing one).
  pushNotified: boolean;
  // How many of the callee's devices took that notification; set once it is sent.
  incomingPush?: Promise<number>;
  // The push endpoint of the callee's device that answered or declined: it gets no closing push,
  // which on iOS would stay there saying the call was taken on another device.
  answeringEndpoint?: string;
};

export type CallParticipant = {
  kind: CallerKindValue;
  id: string;
};

export type CallDropOutcome = {
  status: CallStatus;
  peerMessage: "call_ended" | "call_canceled" | "call_unavailable";
};

export type ParticipantPresence = {
  presence: PresenceState;
  audioSuspended: boolean;
  videoSuspended: boolean;
};
