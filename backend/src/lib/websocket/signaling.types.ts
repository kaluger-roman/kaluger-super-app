import type { CallerKindValue, CallSignalingOutbound } from "../../types";

export type SignalingSender = {
  kind: CallerKindValue;
  id: string;
};

export type OutboundSender = (
  kind: CallerKindValue,
  id: string,
  message: CallSignalingOutbound
) => void;

export const CALL_SIGNAL_TYPES = [
  "call_invite",
  "call_accept",
  "call_reject",
  "call_cancel",
  "call_hangup",
  "webrtc_offer",
  "webrtc_answer",
  "webrtc_ice",
  "call_media_state",
  "call_connected",
] as const;

export type CallSignalType = (typeof CALL_SIGNAL_TYPES)[number];

export const isCallSignalType = (value: unknown): value is CallSignalType =>
  typeof value === "string" &&
  (CALL_SIGNAL_TYPES as readonly string[]).includes(value);
