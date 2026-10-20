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

export const SDP_MAX_LENGTH = 64 * 1024;
export const ICE_CANDIDATE_MAX_LENGTH = 1024;
export const ICE_FIELD_MAX_LENGTH = 256;
export const WS_MAX_PAYLOAD_BYTES = 128 * 1024;

export const CALL_NOT_FOUND_MESSAGE = "Звонок не найден";
export const ALREADY_IN_CALL_MESSAGE = "Сначала завершите текущий звонок";
export const CALL_FAILED_MESSAGE = "Не удалось обработать звонок";
