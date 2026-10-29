import { randomUUID } from "crypto";
import type { CallerKindValue } from "../../types";
import { CALL_RECONNECT_GRACE_MS, RING_TIMEOUT_MS } from "./callSignaling.constants";
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
    tutorName: pair.tutorName,
    studentName: pair.studentName,
    disconnectedAt: {},
    disconnectedTabId: {},
    graceTimers: {},
    pendingPeerRestart: {},
    pushNotified: false,
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

const clearGraceTimer = (call: LiveCall, kind: CallerKindValue): void => {
  const timer = call.graceTimers[kind];
  if (timer) clearTimeout(timer);
  delete call.graceTimers[kind];
};

const clearTimers = (call: LiveCall): void => {
  if (call.ringTimeout) clearTimeout(call.ringTimeout);
  clearGraceTimer(call, "tutor");
  clearGraceTimer(call, "student");
};

// The participant lost the connection of the page `tabId`: the call waits for them, `onExpire` ends
// it without them.
export const markDisconnected = (
  callId: string,
  kind: CallerKindValue,
  at: Date,
  tabId: string | undefined,
  onExpire: (call: LiveCall) => void
): void => {
  const call = liveCalls.get(callId);
  if (!call || call.disconnectedAt[kind]) return;
  call.disconnectedAt[kind] = at;
  if (tabId === undefined) delete call.disconnectedTabId[kind];
  else call.disconnectedTabId[kind] = tabId;
  call.graceTimers[kind] = setTimeout(() => {
    onExpire(call);
  }, CALL_RECONNECT_GRACE_MS);
};

// Returns whether the participant had been out of the call.
export const markReconnected = (callId: string, kind: CallerKindValue): boolean => {
  const call = liveCalls.get(callId);
  if (!call?.disconnectedAt[kind]) return false;
  clearGraceTimer(call, kind);
  delete call.disconnectedAt[kind];
  delete call.disconnectedTabId[kind];
  return true;
};

export const markPeerRestartPending = (
  call: LiveCall,
  kind: CallerKindValue,
  sentTo: object | null
): void => {
  call.pendingPeerRestart[kind] = sentTo;
};

// A write into a socket the server still takes for alive (iOS sleep) is lost without a trace; a
// signal that comes over that socket proves it alive, and with it the request delivered.
export const confirmPeerRestartDelivered = (
  call: LiveCall,
  kind: CallerKindValue,
  connection: object | undefined
): void => {
  if (connection !== undefined && call.pendingPeerRestart[kind] === connection) {
    delete call.pendingPeerRestart[kind];
  }
};

// Returns whether the participant, back over `connection`, may not have the rebuild request of its
// peer's restart (only once).
export const takeUndeliveredPeerRestart = (
  call: LiveCall,
  kind: CallerKindValue,
  connection: object
): boolean => {
  const sentTo = call.pendingPeerRestart[kind];
  if (sentTo === undefined) return false;
  delete call.pendingPeerRestart[kind];
  return sentTo !== connection;
};

// The callee's devices hear about a call once: only the first request sends, and every request
// learns how many devices took it, also one made while the push is still on its way. A call that
// is gone sends nothing.
export const notifyCalleeOnce = (
  callId: string,
  deliver: () => Promise<number>
): Promise<number> => {
  const call = liveCalls.get(callId);
  if (!call) return Promise.resolve(0);
  if (!call.incomingPush) {
    call.pushNotified = true;
    call.incomingPush = deliver();
  }
  return call.incomingPush;
};

// Returns whether the callee got a notification that now has to be closed (only once).
export const takePushNotified = (call: LiveCall): boolean => {
  const notified = call.pushNotified;
  call.pushNotified = false;
  return notified;
};

export const removeCall = (callId: string): LiveCall | undefined => {
  const call = liveCalls.get(callId);
  if (!call) return undefined;
  clearTimers(call);
  liveCalls.delete(callId);
  return call;
};

export const __resetLiveCallsForTests = (): void => {
  liveCalls.forEach(clearTimers);
  liveCalls.clear();
};
