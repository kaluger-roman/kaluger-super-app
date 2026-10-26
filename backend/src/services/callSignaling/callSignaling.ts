import { randomUUID } from "crypto";
import type { CallerKindValue } from "../../types";
import { RING_TIMEOUT_MS } from "./callSignaling.constants";
import type { CallLesson } from "../callRecord";
import type { CallParticipant, LiveCall, ResolvedPair } from "./callSignaling.types";

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

export const getCall = (callId: string): LiveCall | undefined => liveCalls.get(callId);

export const startCall = (
  pair: ResolvedPair,
  callerKind: CallerKindValue,
  lesson: CallLesson | null,
  onRingTimeout: (call: LiveCall) => void
): LiveCall => {
  const callId = randomUUID();
  const call: LiveCall = {
    callId,
    callerKind,
    tutorUserId: pair.tutorUserId,
    studentUserId: pair.studentUserId,
    studentId: pair.studentId,
    lesson,
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

export const removeCall = (callId: string): LiveCall | undefined => {
  const call = liveCalls.get(callId);
  if (!call) return undefined;
  if (call.ringTimeout) clearTimeout(call.ringTimeout);
  liveCalls.delete(callId);
  return call;
};

export const __resetLiveCallsForTests = (): void => {
  for (const call of liveCalls.values()) {
    if (call.ringTimeout) clearTimeout(call.ringTimeout);
  }
  liveCalls.clear();
};
