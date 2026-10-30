import type { CallerKindValue, CallReplyTarget, CallSignalingInbound } from "../../types";
import {
  CallAuthorizationError,
  CallPeerBusyError,
  CallPeerOfflineError,
  CallRateLimitError,
} from "../../utils";
import { toCallLessonSummary } from "../callRecord";
import type { CallLesson } from "../callRecord";
import {
  connectionOf,
  finishCall,
  hangUp,
  notifyCalleeDevices,
  recordCall,
  relayToPeer,
  removeCall,
  send,
} from "./callMessaging";
import {
  handlePresenceUpdate,
  isVisible,
  sendAwayPresencesOnAccept,
  sendCallState,
} from "./callPresence";
import { calleeHasDevices, pushCallClosed } from "./callPush";
import { confirmPeerRestartDelivery, handleResume } from "./callReconnect";
import * as callRegistry from "./callSignaling";
import {
  ALREADY_IN_CALL_MESSAGE,
  CALL_FAILED_MESSAGE,
  CALL_NOT_FOUND_MESSAGE,
  STUDENT_INVITE_WITHOUT_LESSON_MESSAGE,
  TUTOR_INVITE_WITHOUT_TARGET_MESSAGE,
} from "./callSignaling.constants";
import {
  isRingingCallee,
  isSamePair,
  resolveCallLesson,
  resolvePairForStudent,
  resolvePairForTutor,
} from "./callSignaling.helpers";
import type { CallParticipant, LiveCall, ResolvedPair } from "./callSignaling.types";
import { buildIceServers } from "./iceConfig";
import { registerInviteAttempt } from "./inviteRateLimit";
import { isLatestInvite, issueInviteTicket } from "./inviteSequence";

// The caller gets ICE servers with call_accepted, when it actually starts connecting.
const sendRinging = (call: LiveCall, inviteId: string): void => {
  send(callRegistry.getCaller(call), { type: "call_ringing", callId: call.callId, inviteId });
};

const expireRinging = async (call: LiveCall): Promise<void> => {
  if (!removeCall(call, call.callerKind)) return;
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
  if (!removeCall(call, call.callerKind)) return Promise.resolve();
  relayToPeer(call, call.callerKind, {
    type: "call_canceled",
    callId: call.callId,
    reason: "canceled",
  });
  return finishCall(call, "CANCELED");
};

const calleeOf = (sender: CallParticipant, pair: ResolvedPair): CallParticipant =>
  sender.kind === "tutor"
    ? { kind: "student", id: pair.studentUserId }
    : { kind: "tutor", id: pair.tutorUserId };

// R9: a busy callee is never notified; one without a window that looks at the call gets a push
// on its devices, and the call rings as long as some window or device can answer it.
const ringCallee = async (
  sender: CallParticipant,
  pair: ResolvedPair,
  lesson: CallLesson | null,
  inviteId: string,
  hasDevices: boolean
): Promise<void> => {
  const callee = calleeOf(sender, pair);
  if (callRegistry.findActiveCallForParticipant(callee.kind, callee.id)) {
    throw new CallPeerBusyError();
  }
  const connected = connectionOf(callee) !== undefined;
  if (!connected && !hasDevices) {
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

  const call = callRegistry.startCall(pair, sender.kind, lesson, (timedOut) => {
    void expireRinging(timedOut);
  });

  if (connected) {
    send(callee, {
      type: "call_incoming",
      callId: call.callId,
      callerName: sender.kind === "tutor" ? pair.tutorName : pair.studentName,
      lesson: toCallLessonSummary(lesson),
      iceServers: buildIceServers(callee),
    });
  }
  sendRinging(call, inviteId);
  if (!hasDevices || isVisible(callee)) return;
  await notifyCalleeDevices(call);
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
  const hasDevices = await calleeHasDevices(calleeOf(sender, pair));
  // The caller's socket may have closed, or been replaced by a new one, while the pair was resolved.
  if (!senderConnection || connectionOf(sender) !== senderConnection) return;
  // The caller sent a newer invite meanwhile and waits for that one; this one is stale.
  if (!isLatestInvite(sender, ticket)) return;

  const senderCall = callRegistry.findActiveCallForParticipant(sender.kind, sender.id);
  if (!senderCall) {
    await ringCallee(sender, pair, lesson, data.inviteId, hasDevices);
    return;
  }
  if (senderCall.callerKind === sender.kind && senderCall.status === "ringing") {
    // The caller gave up on its previous invite before call_ringing came back and called again,
    // the same peer or another one: the new invite replaces that call, so a late call_cancel
    // for it changes nothing.
    await Promise.all([
      cancelRinging(senderCall),
      ringCallee(sender, pair, lesson, data.inviteId, hasDevices),
    ]);
    return;
  }
  if (isSamePair(senderCall, pair)) throw new CallPeerBusyError();
  throw new CallAuthorizationError(ALREADY_IN_CALL_MESSAGE);
};

const handleRingingAnswer = async (
  call: LiveCall,
  sender: CallParticipant,
  { type, pushEndpoint }: Extract<CallSignalingInbound, { type: "call_accept" | "call_reject" }>
): Promise<void> => {
  if (sender.kind === call.callerKind || call.status !== "ringing") return;
  call.answeringEndpoint = pushEndpoint;
  if (type === "call_accept") {
    callRegistry.markAccepted(call.callId);
    pushCallClosed(call, "call_closed");
    const caller = callRegistry.getCaller(call);
    send(caller, {
      type: "call_accepted",
      callId: call.callId,
      iceServers: buildIceServers(caller),
    });
    sendAwayPresencesOnAccept(call);
    return;
  }
  if (!removeCall(call, sender.kind)) return;
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
  confirmPeerRestartDelivery(sender);
  if (data.type === "call_invite") {
    await handleInvite(sender, data);
    return;
  }
  if (data.type === "presence_update") {
    handlePresenceUpdate(sender, data);
    return;
  }
  if (data.type === "call_sync") {
    sendCallState(sender);
    return;
  }
  if (data.type === "call_resume") {
    await handleResume(sender, data);
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
      await handleRingingAnswer(call, sender, data);
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

// Presence and sync are about the participant, not a call: a failure there has nobody to answer.
const replyTargetOf = (data: CallSignalingInbound): CallReplyTarget | null => {
  if (data.type === "call_invite") return { inviteId: data.inviteId };
  if (data.type === "presence_update" || data.type === "call_sync") return null;
  return { callId: data.callId };
};

export const processCallSignal = async (
  sender: CallParticipant,
  data: CallSignalingInbound
): Promise<void> => {
  try {
    await handleSignal(sender, data);
  } catch (error) {
    const target = replyTargetOf(data);
    if (!target) {
      console.error("processCallSignal failed:", error);
      return;
    }
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

// The participant's call is held by their connection: a new one waits for the call to end. An
// incoming call still ringing is held by none yet, so the device opened from its notification can
// take the connection and answer (R3). Nor is a call that waits for the participant to come back:
// the connection registered since (a hidden tab let in by 4004) has not picked it up with
// call_resume, and the page that holds the call must be able to take the connection back.
export const hasCallHeldByConnection = (kind: CallerKindValue, id: string): boolean => {
  const call = callRegistry.findActiveCallForParticipant(kind, id);
  return call !== undefined && !isRingingCallee(call, { kind, id }) && !call.disconnectedAt[kind];
};

// The participant lost the connection in a call that is kept for their return (call_resume), and
// the page `tabId` may be the one that held it. Other pages let in meanwhile (several tabs released
// by 4004) must not take the connection from each other, or the one restoring the call loses it.
export const isCallAwaitingReturnOf = (
  kind: CallerKindValue,
  id: string,
  tabId: string | undefined
): boolean => {
  const call = callRegistry.findActiveCallForParticipant(kind, id);
  if (call?.disconnectedAt[kind] === undefined) return false;
  const holderTabId = call.disconnectedTabId[kind];
  return holderTabId === undefined || holderTabId === tabId;
};
