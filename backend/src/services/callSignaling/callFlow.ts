import type { CallStatus } from "@prisma/client";
import { getWebSocketManager } from "../../lib/wsManager";
import type {
  CallEndReason,
  CallerKindValue,
  CallReplyTarget,
  CallSignalingInbound,
  CallSignalingOutbound,
} from "../../types";
import {
  CallAuthorizationError,
  CallPeerBusyError,
  CallPeerOfflineError,
  CallRateLimitError,
} from "../../utils";
import { createCallRecord } from "../callRecord";
import type { CreateCallRecordArgs } from "../callRecord";
import * as callRegistry from "./callSignaling";
import {
  ALREADY_IN_CALL_MESSAGE,
  CALL_FAILED_MESSAGE,
  CALL_NOT_FOUND_MESSAGE,
  TUTOR_INVITE_WITHOUT_TARGET_MESSAGE,
} from "./callSignaling.constants";
import {
  isSamePair,
  resolveDropOutcome,
  resolveHangupStatus,
  resolvePairForStudent,
  resolvePairForTutor,
  toDropPeerMessage,
} from "./callSignaling.helpers";
import type { CallParticipant, LiveCall, ResolvedPair } from "./callSignaling.types";
import { buildIceServers } from "./iceConfig";
import { registerInviteAttempt } from "./inviteRateLimit";

const send = (to: CallParticipant, message: CallSignalingOutbound): void => {
  getWebSocketManager()?.sendToParticipant(to.kind, to.id, message);
};

const connectionOf = (participant: CallParticipant) =>
  getWebSocketManager()?.getConnection(participant.kind, participant.id);

const relayToPeer = (
  call: LiveCall,
  senderKind: CallerKindValue,
  message: CallSignalingOutbound
): void => {
  send(callRegistry.getPeer(call, senderKind), message);
};

// Both parties already know how the call ended, so a failed write costs only the history
// entry: it is logged, and the history refresh is skipped because nothing changed.
const recordCall = async (
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

const finishCall = (call: LiveCall, status: CallStatus): Promise<void> =>
  recordCall(
    {
      tutorId: call.tutorUserId,
      studentId: call.studentId,
      callerKind: call.callerKind,
      status,
      startedAt: call.startedAt,
      connectedAt: call.connectedAt,
    },
    call
  );

// The caller gets ICE servers with call_accepted, when it actually starts connecting.
const sendRinging = (call: LiveCall, inviteId: string): void => {
  send(callRegistry.getCaller(call), { type: "call_ringing", callId: call.callId, inviteId });
};

const expireRinging = async (call: LiveCall): Promise<void> => {
  if (!callRegistry.removeCall(call.callId)) return;
  const caller = callRegistry.getCaller(call);
  send(caller, { type: "call_no_answer", callId: call.callId });
  relayToPeer(call, caller.kind, { type: "call_canceled", callId: call.callId, reason: "timeout" });
  await finishCall(call, "MISSED");
};

const resolvePair = (sender: CallParticipant, targetStudentId?: string): Promise<ResolvedPair> => {
  if (sender.kind === "student") return resolvePairForStudent(sender.id);
  if (!targetStudentId) throw new CallAuthorizationError(TUTOR_INVITE_WITHOUT_TARGET_MESSAGE);
  return resolvePairForTutor(sender.id, targetStudentId);
};

const handleInvite = async (
  sender: CallParticipant,
  data: Extract<CallSignalingInbound, { type: "call_invite" }>
): Promise<void> => {
  if (!registerInviteAttempt(sender)) throw new CallRateLimitError();

  const senderConnection = connectionOf(sender);
  const pair = await resolvePair(sender, data.targetStudentId);
  // The caller's socket may have closed, or been replaced by a new one, while the pair was resolved.
  if (!senderConnection || connectionOf(sender) !== senderConnection) return;

  const callee: CallParticipant =
    sender.kind === "tutor"
      ? { kind: "student", id: pair.studentUserId }
      : { kind: "tutor", id: pair.tutorUserId };

  const senderCall = callRegistry.findActiveCallForParticipant(sender.kind, sender.id);
  if (senderCall && isSamePair(senderCall, pair)) {
    if (senderCall.callerKind === sender.kind && senderCall.status === "ringing") {
      sendRinging(senderCall, data.inviteId);
      return;
    }
    throw new CallPeerBusyError();
  }
  if (senderCall) throw new CallAuthorizationError(ALREADY_IN_CALL_MESSAGE);
  if (!connectionOf(callee)) {
    await recordCall(
      {
        tutorId: pair.tutorUserId,
        studentId: pair.studentId,
        callerKind: sender.kind,
        status: "MISSED",
        startedAt: new Date(),
      },
      pair
    );
    throw new CallPeerOfflineError();
  }
  if (callRegistry.findActiveCallForParticipant(callee.kind, callee.id)) {
    throw new CallPeerBusyError();
  }

  const call = callRegistry.startCall(pair, sender.kind, (timedOut) => {
    void expireRinging(timedOut);
  });

  send(callee, {
    type: "call_incoming",
    callId: call.callId,
    callerName: sender.kind === "tutor" ? pair.tutorName : pair.studentName,
    iceServers: buildIceServers(callee),
  });
  sendRinging(call, data.inviteId);
};

const requireParticipantCall = (callId: string, sender: CallParticipant): LiveCall => {
  const call = callRegistry.getCall(callId);
  if (!call || !callRegistry.isParticipant(call, sender.kind, sender.id)) {
    throw new CallAuthorizationError(CALL_NOT_FOUND_MESSAGE);
  }
  return call;
};

const hangUp = async (
  call: LiveCall,
  senderKind: CallerKindValue,
  reason: CallEndReason
): Promise<void> => {
  const status = resolveHangupStatus(call);
  if (!callRegistry.removeCall(call.callId)) return;
  relayToPeer(call, senderKind, { type: "call_ended", callId: call.callId, reason });
  await finishCall(call, status);
};

const handleRingingAnswer = async (
  call: LiveCall,
  sender: CallParticipant,
  type: "call_accept" | "call_reject"
): Promise<void> => {
  if (sender.kind === call.callerKind || call.status !== "ringing") return;
  if (type === "call_accept") {
    callRegistry.markAccepted(call.callId);
    const caller = callRegistry.getCaller(call);
    send(caller, {
      type: "call_accepted",
      callId: call.callId,
      iceServers: buildIceServers(caller),
    });
    return;
  }
  if (!callRegistry.removeCall(call.callId)) return;
  relayToPeer(call, sender.kind, { type: "call_rejected", callId: call.callId });
  await finishCall(call, "REJECTED");
};

const handleCancel = async (call: LiveCall, sender: CallParticipant): Promise<void> => {
  if (sender.kind !== call.callerKind) return;
  if (call.status !== "ringing") {
    await hangUp(call, sender.kind, "hangup");
    return;
  }
  if (!callRegistry.removeCall(call.callId)) return;
  relayToPeer(call, sender.kind, {
    type: "call_canceled",
    callId: call.callId,
    reason: "canceled",
  });
  await finishCall(call, "CANCELED");
};

const relayMediaSignal = (
  call: LiveCall,
  senderKind: CallerKindValue,
  data: Extract<
    CallSignalingInbound,
    { type: "webrtc_offer" | "webrtc_answer" | "webrtc_ice" | "call_media_state" }
  >
): void => {
  if (call.status === "ringing") return;
  relayToPeer(call, senderKind, { ...data, callId: call.callId });
};

const handleSignal = async (sender: CallParticipant, data: CallSignalingInbound): Promise<void> => {
  if (data.type === "call_invite") {
    await handleInvite(sender, data);
    return;
  }

  const isTerminating =
    data.type === "call_reject" || data.type === "call_cancel" || data.type === "call_hangup";
  if (isTerminating && !callRegistry.getCall(data.callId)) return;

  const call = requireParticipantCall(data.callId, sender);

  switch (data.type) {
    case "call_accept":
    case "call_reject":
      await handleRingingAnswer(call, sender, data.type);
      return;
    case "call_cancel":
      await handleCancel(call, sender);
      return;
    case "call_hangup":
      await hangUp(call, sender.kind, data.reason ?? "hangup");
      return;
    case "call_connected":
      callRegistry.markConnected(call.callId);
      return;
    default:
      relayMediaSignal(call, sender.kind, data);
  }
};

const replyTargetOf = (data: CallSignalingInbound): CallReplyTarget =>
  data.type === "call_invite" ? { inviteId: data.inviteId } : { callId: data.callId };

export const processCallSignal = async (
  sender: CallParticipant,
  data: CallSignalingInbound
): Promise<void> => {
  try {
    await handleSignal(sender, data);
  } catch (error) {
    const target = replyTargetOf(data);
    if (error instanceof CallPeerOfflineError) {
      send(sender, { type: "call_unavailable", reason: "offline", ...target });
      return;
    }
    if (error instanceof CallPeerBusyError && data.type === "call_invite") {
      send(sender, { type: "call_busy", inviteId: data.inviteId });
      return;
    }
    if (error instanceof CallAuthorizationError || error instanceof CallRateLimitError) {
      send(sender, { type: "call_error", message: error.message, ...target });
      return;
    }
    console.error("processCallSignal failed:", error);
    send(sender, { type: "call_error", message: CALL_FAILED_MESSAGE, ...target });
  }
};

export const terminateActiveCallForParticipant = async (
  kind: CallerKindValue,
  id: string
): Promise<void> => {
  const call = callRegistry.findActiveCallForParticipant(kind, id);
  if (!call) return;
  const outcome = resolveDropOutcome(call, { kind, id });
  if (!callRegistry.removeCall(call.callId)) return;
  relayToPeer(call, kind, toDropPeerMessage(outcome, call.callId));
  await finishCall(call, outcome.status);
};
