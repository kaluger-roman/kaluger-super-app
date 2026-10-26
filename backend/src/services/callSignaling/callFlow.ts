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
import { createCallRecord, toCallLessonSummary } from "../callRecord";
import type { CallLesson, CreateCallRecordArgs } from "../callRecord";
import * as callRegistry from "./callSignaling";
import {
  ALREADY_IN_CALL_MESSAGE,
  CALL_FAILED_MESSAGE,
  CALL_NOT_FOUND_MESSAGE,
  STUDENT_INVITE_WITHOUT_LESSON_MESSAGE,
  TUTOR_INVITE_WITHOUT_TARGET_MESSAGE,
} from "./callSignaling.constants";
import {
  isSamePair,
  resolveCallLesson,
  resolveDropOutcome,
  resolveHangupStatus,
  resolvePairForStudent,
  resolvePairForTutor,
  toDropPeerMessage,
} from "./callSignaling.helpers";
import type { CallParticipant, LiveCall, ResolvedPair } from "./callSignaling.types";
import { buildIceServers } from "./iceConfig";
import { registerInviteAttempt } from "./inviteRateLimit";
import { isLatestInvite, issueInviteTicket } from "./inviteSequence";

const send = (to: CallParticipant, message: CallSignalingOutbound): void => {
  getWebSocketManager()?.sendToParticipant(to.kind, to.id, message);
};

const connectionOf = (participant: CallParticipant) =>
  getWebSocketManager()?.getConnection(participant.kind, participant.id);

// Tabs of either participant that waited for this call to end may ask for the connection again.
const removeCall = (call: LiveCall): boolean => {
  if (!callRegistry.removeCall(call.callId)) return false;
  const manager = getWebSocketManager();
  manager?.releaseWaitingSockets("tutor", call.tutorUserId);
  manager?.releaseWaitingSockets("student", call.studentUserId);
  return true;
};

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
      lessonId: call.lesson?.id ?? null,
    },
    call
  );

// The caller gets ICE servers with call_accepted, when it actually starts connecting.
const sendRinging = (call: LiveCall, inviteId: string): void => {
  send(callRegistry.getCaller(call), { type: "call_ringing", callId: call.callId, inviteId });
};

const expireRinging = async (call: LiveCall): Promise<void> => {
  if (!removeCall(call)) return;
  const caller = callRegistry.getCaller(call);
  send(caller, { type: "call_no_answer", callId: call.callId });
  relayToPeer(call, caller.kind, { type: "call_canceled", callId: call.callId, reason: "timeout" });
  await finishCall(call, "MISSED");
};

const resolvePair = (
  sender: CallParticipant,
  data: Extract<CallSignalingInbound, { type: "call_invite" }>
): Promise<ResolvedPair> => {
  if (sender.kind === "student") {
    if (!data.lessonId) throw new CallAuthorizationError(STUDENT_INVITE_WITHOUT_LESSON_MESSAGE);
    return resolvePairForStudent(sender.id);
  }
  if (!data.targetStudentId) {
    throw new CallAuthorizationError(TUTOR_INVITE_WITHOUT_TARGET_MESSAGE);
  }
  return resolvePairForTutor(sender.id, data.targetStudentId);
};

const cancelRinging = (call: LiveCall): Promise<void> => {
  if (!removeCall(call)) return Promise.resolve();
  relayToPeer(call, call.callerKind, {
    type: "call_canceled",
    callId: call.callId,
    reason: "canceled",
  });
  return finishCall(call, "CANCELED");
};

const ringCallee = async (
  sender: CallParticipant,
  pair: ResolvedPair,
  lesson: CallLesson | null,
  inviteId: string
): Promise<void> => {
  const callee: CallParticipant =
    sender.kind === "tutor"
      ? { kind: "student", id: pair.studentUserId }
      : { kind: "tutor", id: pair.tutorUserId };

  if (!connectionOf(callee)) {
    await recordCall(
      {
        tutorId: pair.tutorUserId,
        studentId: pair.studentId,
        callerKind: sender.kind,
        status: "MISSED",
        startedAt: new Date(),
        lessonId: lesson?.id ?? null,
      },
      pair
    );
    throw new CallPeerOfflineError();
  }
  if (callRegistry.findActiveCallForParticipant(callee.kind, callee.id)) {
    throw new CallPeerBusyError();
  }

  const call = callRegistry.startCall(pair, sender.kind, lesson, (timedOut) => {
    void expireRinging(timedOut);
  });

  send(callee, {
    type: "call_incoming",
    callId: call.callId,
    callerName: sender.kind === "tutor" ? pair.tutorName : pair.studentName,
    lesson: toCallLessonSummary(lesson),
    iceServers: buildIceServers(callee),
  });
  sendRinging(call, inviteId);
};

const handleInvite = async (
  sender: CallParticipant,
  data: Extract<CallSignalingInbound, { type: "call_invite" }>
): Promise<void> => {
  if (!registerInviteAttempt(sender)) throw new CallRateLimitError();

  const ticket = issueInviteTicket(sender);
  const senderConnection = connectionOf(sender);
  const pair = await resolvePair(sender, data);
  const lesson = data.lessonId ? await resolveCallLesson(pair, data.lessonId) : null;
  // The caller's socket may have closed, or been replaced by a new one, while the pair was resolved.
  if (!senderConnection || connectionOf(sender) !== senderConnection) return;
  // The caller sent a newer invite meanwhile and waits for that one; this one is stale.
  if (!isLatestInvite(sender, ticket)) return;

  const senderCall = callRegistry.findActiveCallForParticipant(sender.kind, sender.id);
  if (!senderCall) {
    await ringCallee(sender, pair, lesson, data.inviteId);
    return;
  }
  if (senderCall.callerKind === sender.kind && senderCall.status === "ringing") {
    // The caller gave up on its previous invite before call_ringing came back and called again,
    // the same peer or another one: the new invite replaces that call, so a late call_cancel
    // for it changes nothing.
    await Promise.all([cancelRinging(senderCall), ringCallee(sender, pair, lesson, data.inviteId)]);
    return;
  }
  if (isSamePair(senderCall, pair)) throw new CallPeerBusyError();
  throw new CallAuthorizationError(ALREADY_IN_CALL_MESSAGE);
};

const hangUp = async (
  call: LiveCall,
  senderKind: CallerKindValue,
  reason: CallEndReason
): Promise<void> => {
  const status = resolveHangupStatus(call);
  if (!removeCall(call)) return;
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
  if (!removeCall(call)) return;
  relayToPeer(call, sender.kind, { type: "call_rejected", callId: call.callId });
  await finishCall(call, "REJECTED");
};

const handleCancel = async (call: LiveCall, sender: CallParticipant): Promise<void> => {
  if (sender.kind !== call.callerKind) return;
  if (call.status !== "ringing") {
    await hangUp(call, sender.kind, "hangup");
    return;
  }
  await cancelRinging(call);
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

  const call = callRegistry.getCall(data.callId);
  // Both parties are told before a call is removed, so a signal for an unknown call is stale.
  if (!call) return;
  if (!callRegistry.isParticipant(call, sender.kind, sender.id)) {
    throw new CallAuthorizationError(CALL_NOT_FOUND_MESSAGE);
  }

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
  if (!removeCall(call)) return;
  relayToPeer(call, kind, toDropPeerMessage(outcome, call.callId));
  await finishCall(call, outcome.status);
};

export const hasActiveCall = (kind: CallerKindValue, id: string): boolean =>
  callRegistry.findActiveCallForParticipant(kind, id) !== undefined;
