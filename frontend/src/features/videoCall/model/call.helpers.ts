import {
  CANCELED_TEXT,
  MISSED_CALL_TEXT,
  PEER_DISCONNECTED_TEXT,
  PEER_HUNG_UP_TEXT,
  PEER_MEDIA_UNAVAILABLE_TEXT,
  PEER_NOT_RETURNED_TEXT,
  PICKER_DISMISSED_ERRORS,
  STUDENT_UNAVAILABLE_TEXT,
  TUTOR_UNAVAILABLE_TEXT,
  UNAVAILABLE_TEXT,
} from "./call.constants";
import type {
  AddressedSignal,
  CallAddress,
  CallPeer,
  CanceledNotice,
  PendingConfirm,
  StartCallParams,
  TerminalSignal,
  TerminatedCall,
} from "./call.types";
import type { CallEndReason, CallRole, CallSignalingInbound } from "./signaling.types";

// The caller's own role: a tutor calls a student, a student calls their tutor.
export const toCallerRole = (params: StartCallParams): CallRole =>
  "studentId" in params ? "tutor" : "student";

export const isPendingConfirm = (
  confirm: PendingConfirm
): confirm is { isOpen: true; call: StartCallParams } => confirm.isOpen && confirm.call !== null;

export const toInviteMessage = (call: StartCallParams, inviteId: string): CallSignalingInbound => ({
  type: "call_invite",
  inviteId,
  ...("studentId" in call ? { targetStudentId: call.studentId } : {}),
  ...(call.lesson ? { lessonId: call.lesson.id } : {}),
});

export const toOutgoingPeer = (params: StartCallParams): CallPeer => ({
  name: params.peerName,
  role: "studentId" in params ? "student" : "tutor",
});

export const hasCallId = (callId: string | null): callId is string => callId !== null;

export const isCallAddress = (address: CallAddress | null): address is CallAddress =>
  address !== null;

export const toTerminalSignal = ({ address, signal }: TerminatedCall): AddressedSignal | null =>
  address && signal ? { role: address.role, message: { ...signal, callId: address.callId } } : null;

export const isAddressedSignal = (signal: AddressedSignal | null): signal is AddressedSignal =>
  signal !== null;

const toPushEndpointField = (pushEndpoint: string | null): { pushEndpoint?: string } =>
  pushEndpoint ? { pushEndpoint } : {};

export const toAcceptSignal = (
  pushEndpoint: string | null,
  { callId, role }: CallAddress
): AddressedSignal => ({
  role,
  message: { type: "call_accept", callId, ...toPushEndpointField(pushEndpoint) },
});

export const toRejectSignal = (pushEndpoint: string | null): TerminalSignal => ({
  type: "call_reject",
  ...toPushEndpointField(pushEndpoint),
});

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
  if (reason === "peer_not_returned") return PEER_NOT_RETURNED_TEXT;
  return PEER_HUNG_UP_TEXT;
};

export const isPeerHangup = (reason: CallEndReason): boolean => reason === "hangup";
