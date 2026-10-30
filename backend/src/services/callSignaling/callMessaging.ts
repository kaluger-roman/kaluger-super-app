import type { CallStatus } from "@prisma/client";
import { getWebSocketManager } from "../../lib/wsManager";
import type { CallEndReason, CallerKindValue, CallSignalingOutbound } from "../../types";
import { createCallRecord } from "../callRecord";
import type { CreateCallRecordArgs } from "../callRecord";
import { pushIncomingCall, pushRingingEnded } from "./callPush";
import * as callRegistry from "./callSignaling";
import {
  resolveDropOutcome,
  resolveHangupStatus,
  toDropPeerMessage,
} from "./callSignaling.helpers";
import type { CallParticipant, LiveCall, ResolvedPair } from "./callSignaling.types";

export const send = (to: CallParticipant, message: CallSignalingOutbound): void => {
  getWebSocketManager()?.sendToParticipant(to.kind, to.id, message);
};

export const connectionOf = (participant: CallParticipant) =>
  getWebSocketManager()?.getConnection(participant.kind, participant.id);

// Every way a call ends goes through here: the notification of a ringing call on the callee's
// devices is closed (missed when the caller or nobody ended it), and tabs of either participant
// that waited for this call to end may ask for the connection again.
export const removeCall = (call: LiveCall, endedBy: CallerKindValue): boolean => {
  if (!callRegistry.removeCall(call.callId)) return false;
  pushRingingEnded(call, endedBy);
  const manager = getWebSocketManager();
  manager?.releaseWaitingSockets("tutor", call.tutorUserId);
  manager?.releaseWaitingSockets("student", call.studentUserId);
  return true;
};

export const relayToPeer = (
  call: LiveCall,
  senderKind: CallerKindValue,
  message: CallSignalingOutbound
): void => {
  send(callRegistry.getPeer(call, senderKind), message);
};

// Both parties already know how the call ended, so a failed write costs only the history
// entry: it is logged, and the history refresh is skipped because nothing changed.
export const recordCall = async (
  record: CreateCallRecordArgs,
  pair: Pick<ResolvedPair, "tutorUserId" | "studentUserId">
): Promise<void> => {
  try {
    await createCallRecord(record);
  } catch (error) {
    console.error("Call record was not saved:", error);
    return;
  }
  send({ kind: "tutor", id: pair.tutorUserId }, { type: "call_history_updated" });
  send({ kind: "student", id: pair.studentUserId }, { type: "call_history_updated" });
};

export const finishCall = (call: LiveCall, status: CallStatus, endedAt?: Date): Promise<void> =>
  recordCall(
    {
      tutorId: call.tutorUserId,
      studentId: call.studentId,
      callerKind: call.callerKind,
      status,
      startedAt: call.startedAt,
      connectedAt: call.connectedAt,
      endedAt,
      lessonId: call.lesson?.id ?? null,
    },
    call
  );

export const hangUp = async (
  call: LiveCall,
  senderKind: CallerKindValue,
  reason: CallEndReason
): Promise<void> => {
  const status = resolveHangupStatus(call);
  if (!removeCall(call, senderKind)) return;
  relayToPeer(call, senderKind, { type: "call_ended", callId: call.callId, reason });
  await finishCall(call, status);
};

export const terminateActiveCallForParticipant = async (
  kind: CallerKindValue,
  id: string
): Promise<void> => {
  const call = callRegistry.findActiveCallForParticipant(kind, id);
  if (!call) return;
  const outcome = resolveDropOutcome(call, { kind, id });
  if (!removeCall(call, kind)) return;
  relayToPeer(call, kind, toDropPeerMessage(outcome, call.callId));
  await finishCall(call, outcome.status);
};

// The callee's devices hear about a ringing call once. If none of them took it and no window is
// open, nobody can answer: the caller hears the callee is offline. Devices notified earlier may
// still answer, so the call keeps ringing then. Asked again once the callee's window is gone, the
// outcome of the push already sent decides.
export const notifyCalleeDevices = async (call: LiveCall): Promise<void> => {
  const delivered = await pushIncomingCall(call);
  // The callee may have opened the app meanwhile, or the call ended or was answered.
  const unreachable =
    delivered === 0 &&
    !connectionOf(callRegistry.getPeer(call, call.callerKind)) &&
    callRegistry.getCall(call.callId) === call &&
    call.status === "ringing";
  if (!unreachable || !removeCall(call, call.callerKind)) return;
  send(callRegistry.getCaller(call), {
    type: "call_unavailable",
    reason: "offline",
    callId: call.callId,
  });
  await finishCall(call, "MISSED");
};
