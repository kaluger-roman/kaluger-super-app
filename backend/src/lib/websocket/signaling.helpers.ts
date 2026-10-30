import type {
  CallSignalingInbound,
  IceCandidatePayload,
  PresenceState,
  SessionDescriptionPayload,
} from "../../types";
import {
  CALL_SIGNAL_TYPES,
  ICE_CANDIDATE_MAX_LENGTH,
  ICE_FIELD_MAX_LENGTH,
  INVITE_ID_MAX_LENGTH,
  LESSON_ID_MAX_LENGTH,
  PRESENCE_STATES,
  PUSH_ENDPOINT_MAX_LENGTH,
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

// The endpoint only narrows the closing push, so an unusable one is dropped, not the answer.
const toPushEndpoint = (value: unknown): { pushEndpoint?: string } =>
  isNonEmptyString(value) && value.length <= PUSH_ENDPOINT_MAX_LENGTH
    ? { pushEndpoint: value }
    : {};

const isPresenceState = (value: unknown): value is PresenceState =>
  PRESENCE_STATES.some((state) => state === value);

// Presence belongs to the participant, not to a call, so it carries no callId.
const toPresenceUpdate = (data: Record<string, unknown>): CallSignalingInbound | null => {
  const { presence, audioSuspended, videoSuspended } = data;
  if (!isPresenceState(presence)) return null;
  if (typeof audioSuspended !== "boolean" || typeof videoSuspended !== "boolean") return null;
  return { type: "presence_update", presence, audioSuspended, videoSuspended };
};

export const parseCallSignal = (data: unknown): CallSignalingInbound | null => {
  if (!isCallSignalMessage(data)) return null;

  if (data.type === "call_invite") return toCallInvite(data);
  if (data.type === "presence_update") return toPresenceUpdate(data);
  if (data.type === "call_sync") return { type: "call_sync" };

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
    case "call_resume":
      return typeof data.sessionRestart === "boolean"
        ? { type: "call_resume", callId, sessionRestart: data.sessionRestart }
        : null;
    case "call_hangup":
      return data.reason === "media_unavailable"
        ? { type: "call_hangup", callId, reason: "media_unavailable" }
        : { type: "call_hangup", callId };
    case "call_accept":
    case "call_reject":
      return { type: data.type, callId, ...toPushEndpoint(data.pushEndpoint) };
    default:
      return { type: data.type, callId };
  }
};
