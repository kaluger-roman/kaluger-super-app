import type { CallMediaState } from "../videoCall.types";
import type { CallStatusMessage } from "./call.types";

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

export const CONNECTION_FAILED_TEXT =
  "Не удалось установить соединение. Проверьте интернет и попробуйте снова";

export const UNAVAILABLE_TEXT = "Собеседник сейчас не в сети";
export const STUDENT_UNAVAILABLE_TEXT = "Ученик сейчас не в сети";
export const TUTOR_UNAVAILABLE_TEXT = "Репетитор сейчас не в сети";
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
export const PICKER_DISMISSED_ERRORS = new Set(["NotAllowedError", "AbortError"]);

export const CONNECTING_MESSAGE: CallStatusMessage = {
  kind: "info",
  text: "Соединение…",
};

export const MEDIA_DENIED_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: MEDIA_DENIED_TEXT,
};

export const TRANSPORT_LOST_TEXT = "Связь с сервером потеряна, звонок завершён";
export const NO_TRANSPORT_TEXT = "Нет связи с сервером. Проверьте интернет и попробуйте снова";
export const CAMERA_FAILED_TEXT = "Не удалось включить камеру. Проверьте разрешения браузера";
