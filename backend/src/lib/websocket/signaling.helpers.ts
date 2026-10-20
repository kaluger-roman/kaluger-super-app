import type { CallDropOutcome } from "../../services/callSignaling";
import type {
  CallSignalingInbound,
  CallSignalingOutbound,
  IceCandidatePayload,
  SessionDescriptionPayload,
} from "../../types";
import {
  CALL_SIGNAL_TYPES,
  ICE_CANDIDATE_MAX_LENGTH,
  ICE_FIELD_MAX_LENGTH,
  SDP_MAX_LENGTH,
} from "./signaling.constants";
import type { CallSignalType } from "./signaling.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isOptionalShortString = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.length <= ICE_FIELD_MAX_LENGTH);

export const isCallSignalType = (value: unknown): value is CallSignalType =>
  typeof value === "string" && (CALL_SIGNAL_TYPES as readonly string[]).includes(value);

export const toSessionDescription = (value: unknown): SessionDescriptionPayload | null => {
  if (!isRecord(value)) return null;
  if (value.type !== "offer" && value.type !== "answer") return null;
  if (typeof value.sdp !== "string" || value.sdp.length > SDP_MAX_LENGTH) return null;
  return { type: value.type, sdp: value.sdp };
};

export const toIceCandidate = (value: unknown): IceCandidatePayload | null => {
  if (!isRecord(value)) return null;
  if (typeof value.candidate !== "string" || value.candidate.length > ICE_CANDIDATE_MAX_LENGTH) {
    return null;
  }
  if (!isOptionalShortString(value.sdpMid) || !isOptionalShortString(value.usernameFragment)) {
    return null;
  }
  const { sdpMLineIndex } = value;
  if (
    sdpMLineIndex !== undefined &&
    sdpMLineIndex !== null &&
    !(typeof sdpMLineIndex === "number" && Number.isInteger(sdpMLineIndex) && sdpMLineIndex >= 0)
  ) {
    return null;
  }
  return {
    candidate: value.candidate,
    sdpMid: (value.sdpMid as string | null | undefined) ?? null,
    sdpMLineIndex: sdpMLineIndex ?? null,
    usernameFragment: (value.usernameFragment as string | null | undefined) ?? null,
  };
};

export const parseCallSignal = (data: unknown): CallSignalingInbound | null => {
  if (!isRecord(data) || !isCallSignalType(data.type)) return null;

  if (data.type === "call_invite") {
    if (data.targetStudentId === undefined) return { type: "call_invite" };
    return isNonEmptyString(data.targetStudentId)
      ? { type: "call_invite", targetStudentId: data.targetStudentId }
      : null;
  }

  if (!isNonEmptyString(data.callId)) return null;
  const { callId } = data;

  switch (data.type) {
    case "webrtc_offer":
    case "webrtc_answer": {
      const sdp = toSessionDescription(data.sdp);
      return sdp ? { type: data.type, callId, sdp } : null;
    }
    case "webrtc_ice": {
      const candidate = toIceCandidate(data.candidate);
      return candidate ? { type: "webrtc_ice", callId, candidate } : null;
    }
    case "call_media_state":
      return typeof data.micOn === "boolean" &&
        typeof data.cameraOn === "boolean" &&
        typeof data.screenSharing === "boolean" &&
        (data.cameraAvailable === undefined || typeof data.cameraAvailable === "boolean")
        ? {
            type: "call_media_state",
            callId,
            micOn: data.micOn,
            cameraOn: data.cameraOn,
            screenSharing: data.screenSharing,
            cameraAvailable: data.cameraAvailable,
          }
        : null;
    case "call_hangup":
      return data.reason === "media_unavailable"
        ? { type: "call_hangup", callId, reason: "media_unavailable" }
        : { type: "call_hangup", callId };
    default:
      return { type: data.type, callId };
  }
};

export const toDropPeerMessage = (
  outcome: CallDropOutcome,
  callId: string
): CallSignalingOutbound => {
  if (outcome.peerMessage === "call_unavailable")
    return { type: "call_unavailable", reason: "offline" };
  if (outcome.peerMessage === "call_canceled") {
    return { type: "call_canceled", callId, reason: "canceled" };
  }
  return { type: "call_ended", callId, reason: "peer_disconnected" };
};
