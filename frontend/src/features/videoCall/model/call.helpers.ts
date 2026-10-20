import {
  CANCELED_TEXT,
  MISSED_CALL_TEXT,
  PEER_DISCONNECTED_TEXT,
  PEER_HUNG_UP_TEXT,
  PEER_MEDIA_UNAVAILABLE_TEXT,
  PICKER_DISMISSED_ERRORS,
  STUDENT_UNAVAILABLE_TEXT,
  TUTOR_UNAVAILABLE_TEXT,
  UNAVAILABLE_TEXT,
} from "./call.constants";
import type { CallAddress, CallPeer, CanceledNotice, StartCallParams } from "./call.types";
import type { CallEndReason, CallRole } from "./signaling.types";

// The caller's own role: a tutor calls a student, a student calls their tutor.
export const toCallerRole = (params: StartCallParams): CallRole =>
  "studentId" in params ? "tutor" : "student";

export const toOutgoingPeer = (params: StartCallParams): CallPeer => ({
  name: params.peerName,
  role: "studentId" in params ? "student" : "tutor",
});

export const hasCallId = (callId: string | null): callId is string => callId !== null;

export const isCallAddress = (address: CallAddress | null): address is CallAddress =>
  address !== null;

export const isPickerDismissed = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  PICKER_DISMISSED_ERRORS.has(String(error.name));

export const toUnavailableText = (role: CallRole | null): string => {
  if (role === "student") return STUDENT_UNAVAILABLE_TEXT;
  if (role === "tutor") return TUTOR_UNAVAILABLE_TEXT;
  return UNAVAILABLE_TEXT;
};

export const toCanceledText = ({ reason, callerName }: CanceledNotice): string => {
  if (reason !== "timeout") return CANCELED_TEXT;
  return callerName ? `${MISSED_CALL_TEXT} от ${callerName}` : MISSED_CALL_TEXT;
};

export const toPeerEndedText = (reason: CallEndReason): string => {
  if (reason === "peer_disconnected") return PEER_DISCONNECTED_TEXT;
  if (reason === "media_unavailable") return PEER_MEDIA_UNAVAILABLE_TEXT;
  return PEER_HUNG_UP_TEXT;
};

export const isPeerHangup = (reason: CallEndReason): boolean => reason === "hangup";
