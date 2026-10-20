import { randomUUID } from "crypto";
import type { CallerKindValue } from "../../types";
import { createFinalizedCallRecord } from "./callRecord";
import { RING_TIMEOUT_MS } from "./callSignaling.constants";
import type {
  CallFinalizeStatus,
  CallParticipant,
  LiveCall,
  ResolvedPair,
} from "./callSignaling.types";

const liveCalls = new Map<string, LiveCall>();

const matchesParticipant = (call: LiveCall, kind: CallerKindValue, id: string): boolean =>
  kind === "tutor" ? call.tutorUserId === id : call.studentUserId === id;

export const findActiveCallForParticipant = (
  kind: CallerKindValue,
  id: string
): LiveCall | undefined => {
  for (const call of liveCalls.values()) {
    if (matchesParticipant(call, kind, id)) return call;
  }
  return undefined;
};

export const findActiveCallForPair = (
  tutorUserId: string,
  studentUserId: string
): LiveCall | undefined => {
  for (const call of liveCalls.values()) {
    if (call.tutorUserId === tutorUserId && call.studentUserId === studentUserId) {
      return call;
    }
  }
  return undefined;
};

export const getCall = (callId: string): LiveCall | undefined => liveCalls.get(callId);

export const startCall = (
  pair: ResolvedPair,
  callerKind: CallerKindValue,
  onRingTimeout: (call: LiveCall) => void
): LiveCall => {
  const callId = randomUUID();
  const call: LiveCall = {
    callId,
    callerKind,
    tutorUserId: pair.tutorUserId,
    studentUserId: pair.studentUserId,
    studentId: pair.studentId,
    studentName: pair.studentName,
    tutorName: pair.tutorName,
    status: "ringing",
    startedAt: new Date(),
  };
  call.ringTimeout = setTimeout(() => {
    onRingTimeout(call);
  }, RING_TIMEOUT_MS);
  liveCalls.set(callId, call);
  return call;
};

export const markAccepted = (callId: string): void => {
  const call = liveCalls.get(callId);
  if (!call || call.status !== "ringing") return;
  if (call.ringTimeout) clearTimeout(call.ringTimeout);
  call.ringTimeout = undefined;
  call.status = "accepted";
};

export const markConnected = (callId: string): void => {
  const call = liveCalls.get(callId);
  if (!call || call.status !== "accepted") return;
  call.status = "connected";
  call.connectedAt = new Date();
};

export const isParticipant = (call: LiveCall, kind: CallerKindValue, id: string): boolean =>
  matchesParticipant(call, kind, id);

export const getPeer = (call: LiveCall, senderKind: CallerKindValue): CallParticipant =>
  senderKind === "tutor"
    ? { kind: "student", id: call.studentUserId }
    : { kind: "tutor", id: call.tutorUserId };

export const getCaller = (call: LiveCall): CallParticipant => ({
  kind: call.callerKind,
  id: call.callerKind === "tutor" ? call.tutorUserId : call.studentUserId,
});

export const terminateCall = async (
  callId: string,
  status: CallFinalizeStatus,
  notifyEnded: (call: LiveCall) => void = () => undefined
): Promise<LiveCall | undefined> => {
  const call = liveCalls.get(callId);
  if (!call) return undefined;
  if (call.ringTimeout) clearTimeout(call.ringTimeout);
  liveCalls.delete(callId);
  // Peers learn about the end before the DB write, so signals sent in that window are not met with "call not found".
  notifyEnded(call);

  await createFinalizedCallRecord({
    tutorId: call.tutorUserId,
    studentId: call.studentId,
    callerKind: call.callerKind,
    status,
    startedAt: call.startedAt,
    endedAt: status === "COMPLETED" ? new Date() : undefined,
    connectedAt: call.connectedAt,
  });

  return call;
};

// The callee was offline, so no live call exists; the attempt still shows up as missed.
export const recordUnreachableCall = (
  pair: ResolvedPair,
  callerKind: CallerKindValue
): Promise<void> =>
  createFinalizedCallRecord({
    tutorId: pair.tutorUserId,
    studentId: pair.studentId,
    callerKind,
    status: "MISSED",
    startedAt: new Date(),
  });

export const __resetLiveCallsForTest = (): void => {
  for (const call of liveCalls.values()) {
    if (call.ringTimeout) clearTimeout(call.ringTimeout);
  }
  liveCalls.clear();
};
