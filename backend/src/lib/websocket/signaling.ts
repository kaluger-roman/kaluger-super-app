import {
  buildIceServers,
  callRegistry,
  resolvePairForStudent,
  resolvePairForTutor,
} from "../../services/callSignaling";
import type { LiveCall } from "../../services/callSignaling";
import type {
  CallerKindValue,
  CallSignalingInbound,
  CallSignalingOutbound,
} from "../../types";
import {
  CallAuthorizationError,
  CallPeerBusyError,
  CallPeerOfflineError,
} from "../../utils";
import { getWebSocketManager } from "../wsManager";
import { isCallSignalType } from "./signaling.types";
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

const isPeerOnline = (kind: CallerKindValue, id: string): boolean => {
  const manager = getWebSocketManager();
  if (!manager) return false;
  return kind === "tutor"
    ? manager.getConnectedUsers().includes(id)
    : manager.getConnectedStudents().includes(id);
};

const peerOf = (
  call: LiveCall,
  senderKind: CallerKindValue
): { kind: CallerKindValue; id: string } =>
  senderKind === "tutor"
    ? { kind: "student", id: call.studentUserId }
    : { kind: "tutor", id: call.tutorUserId };

const relayToPeer = (
  call: LiveCall,
  senderKind: CallerKindValue,
  message: CallSignalingOutbound,
  send: OutboundSender
): void => {
  const peer = peerOf(call, senderKind);
  send(peer.kind, peer.id, message);
};

const handleInvite = async (
  senderKind: CallerKindValue,
  senderId: string,
  data: Extract<CallSignalingInbound, { type: "call_invite" }>,
  send: OutboundSender
): Promise<void> => {
  const existingForSender = callRegistry.findActiveCallForParticipant(
    senderKind,
    senderId
  );
  if (existingForSender?.callerKind === senderKind) {
    return;
  }

  const pair =
    senderKind === "tutor"
      ? await resolvePairForTutor(senderId, data.targetStudentId ?? "")
      : await resolvePairForStudent(senderId);

  const calleeKind: CallerKindValue =
    senderKind === "tutor" ? "student" : "tutor";
  const calleeId =
    senderKind === "tutor" ? pair.studentUserId : pair.tutorUserId;

  const existingForPair = callRegistry.findActiveCallForPair(
    pair.tutorUserId,
    pair.studentUserId
  );
  if (existingForPair?.callerKind === senderKind) {
    return;
  }
  if (existingForPair) {
    throw new CallPeerBusyError();
  }
  if (!isPeerOnline(calleeKind, calleeId)) {
    throw new CallPeerOfflineError();
  }
  if (callRegistry.findActiveCallForParticipant(calleeKind, calleeId)) {
    throw new CallPeerBusyError();
  }

  const call = callRegistry.startCall(pair, senderKind, (timedOut) => {
    void onRingTimeout(timedOut, send);
  });

  const callerName = senderKind === "tutor" ? pair.tutorName : pair.studentName;
  send(calleeKind, calleeId, {
    type: "call_incoming",
    callId: call.callId,
    callerName,
    iceServers: buildIceServers(),
  });
  send(senderKind, senderId, {
    type: "call_ringing",
    callId: call.callId,
    iceServers: buildIceServers(),
  });
};

export const onRingTimeout = async (
  call: LiveCall,
  send: OutboundSender
): Promise<void> => {
  const terminated = await callRegistry.terminateCall(call.callId, "MISSED");
  if (!terminated) return;
  send(terminated.callerKind, callerIdOf(terminated), {
    type: "call_no_answer",
    callId: terminated.callId,
  });
  const callee = peerOf(terminated, terminated.callerKind);
  send(callee.kind, callee.id, {
    type: "call_canceled",
    callId: terminated.callId,
  });
};

const callerIdOf = (call: LiveCall): string =>
  call.callerKind === "tutor" ? call.tutorUserId : call.studentUserId;

const requireParticipantCall = (
  callId: string,
  senderKind: CallerKindValue,
  senderId: string
): LiveCall => {
  const call = callRegistry.getCall(callId);
  if (!call || !callRegistry.isParticipant(call, senderKind, senderId)) {
    throw new CallAuthorizationError("Звонок не найден");
  }
  return call;
};

const handleSignalInner = async (
  senderKind: CallerKindValue,
  senderId: string,
  data: CallSignalingInbound,
  send: OutboundSender
): Promise<void> => {
  if (data.type === "call_invite") {
    await handleInvite(senderKind, senderId, data, send);
    return;
  }

  if (
    !callRegistry.getCall(data.callId) &&
    (data.type === "call_reject" ||
      data.type === "call_cancel" ||
      data.type === "call_hangup")
  ) {
    return;
  }
  const call = requireParticipantCall(data.callId, senderKind, senderId);

  switch (data.type) {
    case "call_accept": {
      if (call.ringTimeout) clearTimeout(call.ringTimeout);
      call.ringTimeout = undefined;
      relayToPeer(call, senderKind, {
        type: "call_accepted",
        callId: call.callId,
        iceServers: buildIceServers(),
      }, send);
      return;
    }
    case "call_reject": {
      const terminated = await callRegistry.terminateCall(call.callId, "REJECTED");
      if (terminated) {
        relayToPeer(terminated, senderKind, {
          type: "call_rejected",
          callId: terminated.callId,
        }, send);
      }
      return;
    }
    case "call_cancel": {
      const terminated = await callRegistry.terminateCall(call.callId, "CANCELED");
      if (terminated) {
        relayToPeer(terminated, senderKind, {
          type: "call_canceled",
          callId: terminated.callId,
        }, send);
      }
      return;
    }
    case "call_hangup": {
      const status = call.connectedAt ? "COMPLETED" : "FAILED";
      const terminated = await callRegistry.terminateCall(call.callId, status);
      if (terminated) {
        relayToPeer(terminated, senderKind, {
          type: "call_ended",
          callId: terminated.callId,
        }, send);
      }
      return;
    }
    case "call_connected": {
      callRegistry.markConnected(call.callId);
      return;
    }
    case "webrtc_offer":
      relayToPeer(call, senderKind, { type: "webrtc_offer", callId: call.callId, sdp: data.sdp }, send);
      return;
    case "webrtc_answer":
      relayToPeer(call, senderKind, { type: "webrtc_answer", callId: call.callId, sdp: data.sdp }, send);
      return;
    case "webrtc_ice":
      relayToPeer(call, senderKind, { type: "webrtc_ice", callId: call.callId, candidate: data.candidate }, send);
      return;
    case "call_media_state":
      relayToPeer(call, senderKind, {
        type: "call_media_state",
        callId: call.callId,
        micOn: data.micOn,
        cameraOn: data.cameraOn,
        screenSharing: data.screenSharing,
      }, send);
      return;
  }
};

const hasStringCallId = (record: Record<string, unknown>): boolean =>
  typeof record.callId === "string" && record.callId.length > 0;

const isValidCallSignal = (data: unknown): data is CallSignalingInbound => {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  if (!isCallSignalType(record.type)) return false;
  if (record.type === "call_invite") return true;
  if (!hasStringCallId(record)) return false;
  if (record.type === "webrtc_offer" || record.type === "webrtc_answer") {
    return record.sdp !== undefined && record.sdp !== null;
  }
  if (record.type === "webrtc_ice") {
    return record.candidate !== undefined && record.candidate !== null;
  }
  if (record.type === "call_media_state") {
    return (
      typeof record.micOn === "boolean" &&
      typeof record.cameraOn === "boolean" &&
      typeof record.screenSharing === "boolean"
    );
  }
  return true;
};

export const handleCallSignal = async (
  senderKind: CallerKindValue,
  senderId: string | undefined,
  data: unknown,
  send: OutboundSender = defaultSend
): Promise<void> => {
  if (!senderId) return;
  if (!isValidCallSignal(data)) return;
  try {
    await handleSignalInner(senderKind, senderId, data, send);
  } catch (error) {
    if (error instanceof CallPeerOfflineError) {
      send(senderKind, senderId, { type: "call_unavailable", reason: "offline" });
      return;
    }
    if (error instanceof CallPeerBusyError) {
      send(senderKind, senderId, { type: "call_busy" });
      return;
    }
    if (error instanceof CallAuthorizationError) {
      send(senderKind, senderId, { type: "call_error", message: error.message });
      return;
    }
    console.error("handleCallSignal failed:", error);
    send(senderKind, senderId, {
      type: "call_error",
      message: "Не удалось обработать звонок",
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
  const wasConnected = call.connectedAt != null;
  const droppedByCaller = kind === call.callerKind;
  const status = wasConnected
    ? "COMPLETED"
    : droppedByCaller
      ? "CANCELED"
      : "MISSED";
  const terminated = await callRegistry.terminateCall(call.callId, status);
  if (!terminated) return;
  const peer = peerOf(terminated, kind);
  send(peer.kind, peer.id, {
    type: wasConnected ? "call_ended" : "call_canceled",
    callId: terminated.callId,
  });
};
