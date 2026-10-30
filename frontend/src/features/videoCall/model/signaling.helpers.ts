import { isRecord } from "@shared";

import * as callModel from "./call.model";
import { CALL_CANCEL_REASONS, CALL_END_REASONS } from "./signaling.constants";
import type {
  CallCancelReason,
  CallEndReason,
  CallReplyTarget,
  CallRole,
  CallSignalingOutbound,
} from "./signaling.types";
import {
  isString,
  toCallLesson,
  toCallSnapshot,
  toIceServers,
  toPeerPresenceState,
} from "./signalingSnapshot.helpers";

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || isString(value);

const isNullableString = (value: unknown): value is string | null | undefined =>
  value === null || isOptionalString(value);

const isEndReason = (value: unknown): value is CallEndReason =>
  CALL_END_REASONS.some((reason) => reason === value);

const isCancelReason = (value: unknown): value is CallCancelReason =>
  CALL_CANCEL_REASONS.some((reason) => reason === value);

const toSdp = (value: unknown): RTCSessionDescriptionInit | null => {
  if (!isRecord(value) || !isString(value.sdp)) return null;
  if (value.type !== "offer" && value.type !== "answer") return null;
  return { type: value.type, sdp: value.sdp };
};

const toCandidate = (value: unknown): RTCIceCandidateInit | null => {
  if (!isRecord(value)) return null;
  const { candidate, sdpMid, sdpMLineIndex, usernameFragment } = value;
  if (!isString(candidate) || !isNullableString(sdpMid) || !isNullableString(usernameFragment)) {
    return null;
  }
  if (sdpMLineIndex !== undefined && sdpMLineIndex !== null && typeof sdpMLineIndex !== "number") {
    return null;
  }
  return { candidate, sdpMid, sdpMLineIndex, usernameFragment };
};

const toReplyTarget = (data: Record<string, unknown>): CallReplyTarget | null => {
  if (isString(data.callId)) return { callId: data.callId };
  if (isString(data.inviteId)) return { inviteId: data.inviteId };
  return null;
};

const toMediaSignal = (
  data: Record<string, unknown>,
  callId: string
): CallSignalingOutbound | null => {
  const { micOn, cameraOn, screenSharing, cameraAvailable } = data;
  if (
    typeof micOn !== "boolean" ||
    typeof cameraOn !== "boolean" ||
    typeof screenSharing !== "boolean" ||
    typeof cameraAvailable !== "boolean"
  ) {
    return null;
  }
  return { type: "call_media_state", callId, micOn, cameraOn, screenSharing, cameraAvailable };
};

const toCallState = (data: Record<string, unknown>): CallSignalingOutbound | null => {
  if (data.call === null) return { type: "call_state", call: null };
  const call = toCallSnapshot(data.call);
  return call ? { type: "call_state", call } : null;
};

// Signals that carry no callId: replies to an invite, the history notice and the call snapshot.
const parseCallFreeSignal = (data: Record<string, unknown>): CallSignalingOutbound | null => {
  switch (data.type) {
    case "call_history_updated":
      return { type: "call_history_updated" };
    case "call_state":
      return toCallState(data);
    case "call_busy":
      return isString(data.inviteId) ? { type: "call_busy", inviteId: data.inviteId } : null;
    case "call_unavailable": {
      const target = toReplyTarget(data);
      return target && data.reason === "offline"
        ? { type: "call_unavailable", reason: "offline", ...target }
        : null;
    }
    case "call_error": {
      const target = toReplyTarget(data);
      return target && isString(data.message)
        ? { type: "call_error", message: data.message, ...target }
        : null;
    }
    default:
      return null;
  }
};

// Server messages are untrusted input: only well-formed call signals reach the call model.
export const parseCallSignal = (data: unknown): CallSignalingOutbound | null => {
  if (!isRecord(data)) return null;
  const freeSignal = parseCallFreeSignal(data);
  if (freeSignal) return freeSignal;
  if (!isString(data.callId)) return null;
  const { callId } = data;

  switch (data.type) {
    case "call_incoming": {
      const iceServers = toIceServers(data.iceServers);
      return iceServers && isString(data.callerName)
        ? {
            type: "call_incoming",
            callId,
            callerName: data.callerName,
            lesson: toCallLesson(data.lesson),
            iceServers,
          }
        : null;
    }
    case "call_ringing":
      return isString(data.inviteId)
        ? { type: "call_ringing", callId, inviteId: data.inviteId }
        : null;
    case "call_accepted": {
      const iceServers = toIceServers(data.iceServers);
      return iceServers ? { type: "call_accepted", callId, iceServers } : null;
    }
    case "call_rejected":
    case "call_no_answer":
    case "call_restart_announced":
      return { type: data.type, callId };
    case "call_canceled":
      return isCancelReason(data.reason)
        ? { type: "call_canceled", callId, reason: data.reason }
        : null;
    case "call_ended":
      return isEndReason(data.reason) ? { type: "call_ended", callId, reason: data.reason } : null;
    case "webrtc_offer":
    case "webrtc_answer": {
      const sdp = toSdp(data.sdp);
      return sdp ? { type: data.type, callId, sdp } : null;
    }
    case "webrtc_ice": {
      const candidate = toCandidate(data.candidate);
      return candidate ? { type: "webrtc_ice", callId, candidate } : null;
    }
    case "call_media_state":
      return toMediaSignal(data, callId);
    case "call_peer_presence": {
      const presence = toPeerPresenceState(data);
      return presence ? { type: "call_peer_presence", callId, ...presence } : null;
    }
    case "call_peer_resumed":
      return typeof data.sessionRestart === "boolean"
        ? { type: "call_peer_resumed", callId, sessionRestart: data.sessionRestart }
        : null;
    default:
      return null;
  }
};

export const dispatchCallSignal = (message: CallSignalingOutbound, role: CallRole): void => {
  callModel.signalReceived({ message, role });
};
