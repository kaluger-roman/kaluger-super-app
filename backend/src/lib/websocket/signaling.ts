import {
  buildIceServers,
  callRegistry,
  registerInviteAttempt,
  resolveDropOutcome,
  resolveHangupStatus,
  resolvePairForStudent,
  resolvePairForTutor,
} from "../../services/callSignaling";
import type {
  CallFinalizeStatus,
  CallParticipant,
  LiveCall,
  ResolvedPair,
} from "../../services/callSignaling";
import type {
  CallEndReason,
  CallerKindValue,
  CallSignalingInbound,
  CallSignalingOutbound,
} from "../../types";
import {
  CallAuthorizationError,
  CallPeerBusyError,
  CallPeerOfflineError,
  CallRateLimitError,
} from "../../utils";
import { getWebSocketManager } from "../wsManager";
import {
  ALREADY_IN_CALL_MESSAGE,
  CALL_FAILED_MESSAGE,
  CALL_NOT_FOUND_MESSAGE,
} from "./signaling.constants";
import { parseCallSignal, toDropPeerMessage } from "./signaling.helpers";
import type { OutboundSender } from "./signaling.types";

const defaultSend: OutboundSender = (kind, id, message) => {
  const manager = getWebSocketManager();
  if (!manager) return;
  if (kind === "tutor") {
    manager.sendToUser(id, message);
  } else {
    manager.sendToStudent(id, message);
  }
};

const isPeerOnline = (peer: CallParticipant): boolean => {
  const manager = getWebSocketManager();
  if (!manager) return false;
  return peer.kind === "tutor"
    ? manager.getConnectedUsers().includes(peer.id)
    : manager.getConnectedStudents().includes(peer.id);
};

const relayToPeer = (
  call: LiveCall,
  senderKind: CallerKindValue,
  message: CallSignalingOutbound,
  send: OutboundSender
): void => {
  const peer = callRegistry.getPeer(call, senderKind);
  send(peer.kind, peer.id, message);
};

// Sent after the record is written, so an open history page can refetch and see it.
const notifyHistoryUpdated = (
  pair: Pick<ResolvedPair, "tutorUserId" | "studentUserId">,
  send: OutboundSender
): void => {
  send("tutor", pair.tutorUserId, { type: "call_history_updated" });
  send("student", pair.studentUserId, { type: "call_history_updated" });
};

const endCall = async (
  send: OutboundSender,
  callId: string,
  status: CallFinalizeStatus,
  notifyEnded: (call: LiveCall) => void
): Promise<void> => {
  const terminated = await callRegistry.terminateCall(callId, status, notifyEnded);
  if (terminated) notifyHistoryUpdated(terminated, send);
};

const sendRinging = (call: LiveCall, send: OutboundSender): void => {
  const caller = callRegistry.getCaller(call);
  send(caller.kind, caller.id, {
    type: "call_ringing",
    callId: call.callId,
    iceServers: buildIceServers(caller),
  });
};

const handleInvite = async (
  sender: CallParticipant,
  data: Extract<CallSignalingInbound, { type: "call_invite" }>,
  send: OutboundSender
): Promise<void> => {
  if (!registerInviteAttempt(sender)) throw new CallRateLimitError();

  const pair =
    sender.kind === "tutor"
      ? await resolvePairForTutor(sender.id, data.targetStudentId ?? "")
      : await resolvePairForStudent(sender.id);

  const callee: CallParticipant =
    sender.kind === "tutor"
      ? { kind: "student", id: pair.studentUserId }
      : { kind: "tutor", id: pair.tutorUserId };

  // The caller's socket may have closed while the pair was being resolved.
  if (!isPeerOnline(sender)) return;

  const existingForPair = callRegistry.findActiveCallForPair(pair.tutorUserId, pair.studentUserId);
  if (existingForPair?.callerKind === sender.kind && existingForPair.status === "ringing") {
    sendRinging(existingForPair, send);
    return;
  }
  if (existingForPair) throw new CallPeerBusyError();
  if (callRegistry.findActiveCallForParticipant(sender.kind, sender.id)) {
    throw new CallAuthorizationError(ALREADY_IN_CALL_MESSAGE);
  }
  if (!isPeerOnline(callee)) {
    await callRegistry.recordUnreachableCall(pair, sender.kind);
    notifyHistoryUpdated(pair, send);
    throw new CallPeerOfflineError();
  }
  if (callRegistry.findActiveCallForParticipant(callee.kind, callee.id)) {
    throw new CallPeerBusyError();
  }

  const call = callRegistry.startCall(pair, sender.kind, (timedOut) => {
    void onRingTimeout(timedOut, send);
  });

  send(callee.kind, callee.id, {
    type: "call_incoming",
    callId: call.callId,
    callerName: sender.kind === "tutor" ? pair.tutorName : pair.studentName,
    iceServers: buildIceServers(callee),
  });
  sendRinging(call, send);
};

export const onRingTimeout = async (call: LiveCall, send: OutboundSender): Promise<void> => {
  await endCall(send, call.callId, "MISSED", (terminated) => {
    const caller = callRegistry.getCaller(terminated);
    send(caller.kind, caller.id, { type: "call_no_answer", callId: terminated.callId });
    relayToPeer(
      terminated,
      caller.kind,
      { type: "call_canceled", callId: terminated.callId, reason: "timeout" },
      send
    );
  });
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
  send: OutboundSender,
  reason: CallEndReason = "hangup"
) => {
  await endCall(send, call.callId, resolveHangupStatus(call), (terminated) =>
    relayToPeer(
      terminated,
      senderKind,
      { type: "call_ended", callId: terminated.callId, reason },
      send
    )
  );
};

const handleRingingAnswer = async (
  call: LiveCall,
  sender: CallParticipant,
  type: "call_accept" | "call_reject",
  send: OutboundSender
): Promise<void> => {
  if (sender.kind === call.callerKind || call.status !== "ringing") return;
  if (type === "call_accept") {
    callRegistry.markAccepted(call.callId);
    const caller = callRegistry.getCaller(call);
    send(caller.kind, caller.id, {
      type: "call_accepted",
      callId: call.callId,
      iceServers: buildIceServers(caller),
    });
    return;
  }
  await endCall(send, call.callId, "REJECTED", (terminated) =>
    relayToPeer(terminated, sender.kind, { type: "call_rejected", callId: call.callId }, send)
  );
};

const handleCancel = async (
  call: LiveCall,
  sender: CallParticipant,
  send: OutboundSender
): Promise<void> => {
  if (sender.kind !== call.callerKind) return;
  if (call.status !== "ringing") {
    await hangUp(call, sender.kind, send);
    return;
  }
  await endCall(send, call.callId, "CANCELED", (terminated) =>
    relayToPeer(
      terminated,
      sender.kind,
      { type: "call_canceled", callId: call.callId, reason: "canceled" },
      send
    )
  );
};

const relayMediaSignal = (
  call: LiveCall,
  senderKind: CallerKindValue,
  data: Extract<
    CallSignalingInbound,
    { type: "webrtc_offer" | "webrtc_answer" | "webrtc_ice" | "call_media_state" }
  >,
  send: OutboundSender
): void => {
  if (call.status === "ringing") return;
  relayToPeer(call, senderKind, { ...data, callId: call.callId }, send);
};

const handleSignalInner = async (
  sender: CallParticipant,
  data: CallSignalingInbound,
  send: OutboundSender
): Promise<void> => {
  if (data.type === "call_invite") {
    await handleInvite(sender, data, send);
    return;
  }

  const isTerminating =
    data.type === "call_reject" || data.type === "call_cancel" || data.type === "call_hangup";
  if (isTerminating && !callRegistry.getCall(data.callId)) return;

  const call = requireParticipantCall(data.callId, sender);

  switch (data.type) {
    case "call_accept":
    case "call_reject":
      await handleRingingAnswer(call, sender, data.type, send);
      return;
    case "call_cancel":
      await handleCancel(call, sender, send);
      return;
    case "call_hangup":
      await hangUp(call, sender.kind, send, data.reason ?? "hangup");
      return;
    case "call_connected":
      callRegistry.markConnected(call.callId);
      return;
    default:
      relayMediaSignal(call, sender.kind, data, send);
  }
};

const callIdOf = (data: CallSignalingInbound): string | undefined =>
  "callId" in data ? data.callId : undefined;

export const handleCallSignal = async (
  senderKind: CallerKindValue,
  senderId: string | undefined,
  raw: unknown,
  send: OutboundSender = defaultSend
): Promise<void> => {
  if (!senderId) return;
  const data = parseCallSignal(raw);
  if (!data) return;
  try {
    await handleSignalInner({ kind: senderKind, id: senderId }, data, send);
  } catch (error) {
    if (error instanceof CallPeerOfflineError) {
      send(senderKind, senderId, { type: "call_unavailable", reason: "offline" });
      return;
    }
    if (error instanceof CallPeerBusyError) {
      send(senderKind, senderId, { type: "call_busy" });
      return;
    }
    if (error instanceof CallAuthorizationError || error instanceof CallRateLimitError) {
      send(senderKind, senderId, {
        type: "call_error",
        message: error.message,
        callId: callIdOf(data),
      });
      return;
    }
    console.error("handleCallSignal failed:", error);
    send(senderKind, senderId, {
      type: "call_error",
      message: CALL_FAILED_MESSAGE,
      callId: callIdOf(data),
    });
  }
};

export const terminateActiveCallForParticipant = async (
  kind: CallerKindValue,
  id: string,
  send: OutboundSender = defaultSend
): Promise<void> => {
  const call = callRegistry.findActiveCallForParticipant(kind, id);
  if (!call) return;
  const outcome = resolveDropOutcome(call, { kind, id });
  await endCall(send, call.callId, outcome.status, (terminated) =>
    relayToPeer(terminated, kind, toDropPeerMessage(outcome, terminated.callId), send)
  );
};
