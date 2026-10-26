import type { CallHistoryStatus } from "@entities";

// The caller's view of a call nobody answered (callee offline or ring timeout).
export const OUTGOING_UNANSWERED_LABEL = "Без ответа";

export const CALL_STATUS_LABELS: Record<CallHistoryStatus, string> = {
  COMPLETED: "Завершён",
  MISSED: "Пропущен",
  REJECTED: "Отклонён",
  CANCELED: "Отменён",
  FAILED: "Не удалось соединиться",
};

export const CALL_SCREEN_BACKGROUND =
  "radial-gradient(circle at 50% 25%, #0d2417 0%, #050d08 100%)";

export const CONNECTING_TEXT = "Соединение…";

// FR-032: the tutor sees why the student dropped out; the student only ever sees neutral wording.
export const RECONNECTING_TEXT = "Восстанавливаем связь…";
export const STUDENT_MINIMIZED_TEXT = "Ученик свернул приложение";
export const STUDENT_MIC_SUSPENDED_TEXT =
  "Микрофон ученика приостановлен — ученик свернул приложение";
export const PEER_AUDIO_UNAVAILABLE_TEXT = "Звук временно недоступен";

export const BACKGROUND_AUDIO_HINT_TEXT =
  "На iPhone, пока приложение свёрнуто, собеседник вас не слышит. Звонок не прервётся — просто вернитесь";

export const ENABLE_SOUND_LABEL = "Нажмите, чтобы включить звук";
