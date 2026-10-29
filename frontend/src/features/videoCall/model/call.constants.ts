import type { CallMediaState } from "../videoCall.types";

export const DEFAULT_SELF_MEDIA_STATE: CallMediaState = {
  micOn: true,
  cameraOn: true,
  screenSharing: false,
  cameraAvailable: true,
};

export const DEFAULT_PEER_MEDIA_STATE: CallMediaState = {
  micOn: true,
  cameraOn: true,
  screenSharing: false,
  cameraAvailable: true,
};

export const CALL_DURATION_TICK_MS = 1000;
// The dialing screen waits this long for the server to confirm the call rings: an offline callee
// is refused within a round trip, and the screen would only flash.
export const OUTGOING_REVEAL_DELAY_MS = 500;

export const CONNECTION_FAILED_TEXT =
  "Не удалось установить соединение. Проверьте интернет и попробуйте снова";

export const UNAVAILABLE_TEXT = "Собеседник сейчас не в сети";
export const STUDENT_UNAVAILABLE_TEXT = "Ученик сейчас не в сети";
export const TUTOR_UNAVAILABLE_TEXT = "Преподаватель сейчас не в сети";
export const MISSED_CALL_TEXT = "Пропущенный вызов";
export const PEER_HUNG_UP_TEXT = "Собеседник завершил звонок";
export const PEER_DISCONNECTED_TEXT = "Собеседник отключился";
export const PEER_MEDIA_UNAVAILABLE_TEXT = "У собеседника нет доступа к камере и микрофону";
export const BUSY_TEXT = "Абонент занят";
export const NO_ANSWER_TEXT = "Нет ответа";
export const REJECTED_TEXT = "Вызов отклонён";
export const CANCELED_TEXT = "Вызов отменён";
export const MEDIA_DENIED_TEXT = "Нет доступа к камере и микрофону";
export const SCREEN_SHARE_BUSY_TEXT = "Собеседник уже демонстрирует экран";
export const SCREEN_SHARE_FAILED_TEXT = "Не удалось начать демонстрацию экрана";
export const SCREEN_SHARE_STOP_FAILED_TEXT = "Не удалось вернуть камеру после демонстрации экрана";
export const RENEGOTIATION_FAILED_TEXT =
  "Не удалось обновить видео собеседника. Если оно пропало, перезвоните";
export const PICKER_DISMISSED_ERRORS = new Set(["NotAllowedError", "AbortError"]);

export const PEER_NOT_RETURNED_TEXT = "Собеседник не вернулся в звонок";
// The participant came back after the call ended without them (wait expired or the peer hung up).
export const CALL_ENDED_TEXT = "Звонок завершён";
// The app was opened from a call notification of a call that is already over (FR-017).
export const CALL_ALREADY_ENDED_TEXT = "Звонок уже завершён";
export const NO_TRANSPORT_TEXT = "Нет связи с сервером. Проверьте интернет и попробуйте снова";
export const CAMERA_FAILED_TEXT = "Не удалось включить камеру. Проверьте разрешения браузера";
export const MIC_BUSY_TEXT = "Микрофон занят другим приложением";
export const CAMERA_BUSY_TEXT = "Камера занята другим приложением";
export const MIC_AND_CAMERA_BUSY_TEXT = "Микрофон и камера заняты другим приложением";
