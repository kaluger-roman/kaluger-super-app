import type { PeerPresencePayload } from "../../types";
import type { ParticipantPresence } from "./callSignaling.types";

export const RING_TIMEOUT_MS = 40000;
// A participant who lost the connection keeps the call this long before it ends without them.
export const CALL_RECONNECT_GRACE_MS = 180_000;

export const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";
// Long enough for a lesson-length call: coturn re-checks credentials on allocation refresh.
export const DEFAULT_TURN_TTL_SECONDS = 4 * 60 * 60;

export const INVITE_RATE_LIMIT = 10;
export const INVITE_RATE_WINDOW_MS = 60 * 1000;

export const TUTOR_INVITE_WITHOUT_TARGET_MESSAGE = "Не выбран ученик для звонка";
export const STUDENT_INVITE_WITHOUT_LESSON_MESSAGE = "Звонок возможен только по уроку";
export const CALL_LESSON_NOT_FOUND_MESSAGE = "Урок не найден";
export const CALL_NOT_FOUND_MESSAGE = "Звонок не найден";
export const ALREADY_IN_CALL_MESSAGE = "Сначала завершите текущий звонок";
export const CALL_FAILED_MESSAGE = "Не удалось обработать звонок";

// A freshly connected participant counts as looking at the app until it says otherwise.
export const DEFAULT_PRESENCE: ParticipantPresence = {
  presence: "on_screen",
  audioSuspended: false,
  videoSuspended: false,
};

export const DISCONNECTED_PRESENCE: PeerPresencePayload = {
  presence: "disconnected",
  audioSuspended: false,
  videoSuspended: false,
};
