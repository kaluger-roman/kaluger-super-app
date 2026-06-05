import { randomUUID } from "crypto";
import type { CallerKindValue } from "../../types";
import { createFinalizedCallRecord } from "./callRecord";
import { RING_TIMEOUT_MS } from "./callSignaling.constants";
import type {
  CallFinalizeStatus,
  LiveCall,
  ResolvedPair,
} from "./callSignaling.types";

const liveCalls = new Map<string, LiveCall>();

const matchesParticipant = (
  call: LiveCall,
  kind: CallerKindValue,
  id: string
): boolean =>
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
    if (
      call.tutorUserId === tutorUserId &&
      call.studentUserId === studentUserId
    ) {
      return call;
    }
  }
  return undefined;
};

export const getCall = (callId: string): LiveCall | undefined =>
  liveCalls.get(callId);

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

export const markConnected = (callId: string): void => {
  const call = liveCalls.get(callId);
  if (!call || call.connectedAt) return;
  call.status = "connected";
  call.connectedAt = new Date();
};

export const isParticipant = (
  call: LiveCall,
  kind: CallerKindValue,
  id: string
): boolean => matchesParticipant(call, kind, id);

export const getPeer = (
  call: LiveCall,
  senderKind: CallerKindValue
): { kind: CallerKindValue; id: string } =>
  senderKind === "tutor"
    ? { kind: "student", id: call.studentUserId }
    : { kind: "tutor", id: call.tutorUserId };

export const terminateCall = async (
  callId: string,
  status: CallFinalizeStatus
): Promise<LiveCall | undefined> => {
  const call = liveCalls.get(callId);
  if (!call) return undefined;
  if (call.ringTimeout) clearTimeout(call.ringTimeout);
  liveCalls.delete(callId);

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

export const __resetLiveCallsForTest = (): void => {
  for (const call of liveCalls.values()) {
    if (call.ringTimeout) clearTimeout(call.ringTimeout);
  }
  liveCalls.clear();
};
