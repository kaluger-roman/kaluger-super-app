import type {
  CallSignalingInbound,
  IceCandidatePayload,
  SessionDescriptionPayload,
} from "../../types";
import {
  CALL_SIGNAL_TYPES,
  ICE_CANDIDATE_MAX_LENGTH,
  ICE_FIELD_MAX_LENGTH,
  INVITE_ID_MAX_LENGTH,
  LESSON_ID_MAX_LENGTH,
  SDP_MAX_LENGTH,
} from "./signaling.constants";
import type { CallSignalType } from "./signaling.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isOptionalShortString = (value: unknown): value is string | null | undefined =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.length <= ICE_FIELD_MAX_LENGTH);

const isCallSignalType = (value: unknown): value is CallSignalType =>
  typeof value === "string" && (CALL_SIGNAL_TYPES as readonly string[]).includes(value);

export const isCallSignalMessage = (
  data: unknown
): data is Record<string, unknown> & { type: CallSignalType } =>
  isRecord(data) && isCallSignalType(data.type);

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
  const { sdpMid, usernameFragment, sdpMLineIndex } = value;
  if (!isOptionalShortString(sdpMid) || !isOptionalShortString(usernameFragment)) {
    return null;
  }
  if (
    sdpMLineIndex !== undefined &&
    sdpMLineIndex !== null &&
    !(typeof sdpMLineIndex === "number" && Number.isInteger(sdpMLineIndex) && sdpMLineIndex >= 0)
  ) {
    return null;
  }
  return {
    candidate: value.candidate,
    sdpMid: sdpMid ?? null,
    sdpMLineIndex: sdpMLineIndex ?? null,
    usernameFragment: usernameFragment ?? null,
  };
};

const toCallInvite = (data: Record<string, unknown>): CallSignalingInbound | null => {
  const { inviteId, targetStudentId, lessonId } = data;
  if (!isNonEmptyString(inviteId) || inviteId.length > INVITE_ID_MAX_LENGTH) return null;
  if (targetStudentId !== undefined && !isNonEmptyString(targetStudentId)) return null;
  if (
    lessonId !== undefined &&
    !(isNonEmptyString(lessonId) && lessonId.length <= LESSON_ID_MAX_LENGTH)
  ) {
    return null;
  }
  return {
    type: "call_invite",
    inviteId,
    ...(targetStudentId === undefined ? {} : { targetStudentId }),
    ...(lessonId === undefined ? {} : { lessonId }),
  };
};

export const parseCallSignal = (data: unknown): CallSignalingInbound | null => {
  if (!isCallSignalMessage(data)) return null;

  if (data.type === "call_invite") return toCallInvite(data);

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
        typeof data.cameraAvailable === "boolean"
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
