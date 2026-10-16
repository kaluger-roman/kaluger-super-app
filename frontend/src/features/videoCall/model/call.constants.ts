import type { CallMediaState } from "../videoCall.types";
import type { CallStatusMessage } from "./call.types";

export const DEFAULT_SELF_MEDIA_STATE: CallMediaState = {
  micOn: true,
  cameraOn: true,
  screenSharing: false,
};

export const DEFAULT_PEER_MEDIA_STATE: CallMediaState = {
  micOn: true,
  cameraOn: true,
  screenSharing: false,
};

export const CALL_DURATION_TICK_MS = 1000;

export const CONNECTION_FAILED_TEXT =
  "Не удалось установить соединение. Проверьте интернет и попробуйте снова";

export const UNAVAILABLE_TEXT = "Собеседник сейчас не в сети";
export const BUSY_TEXT = "Абонент занят";
export const NO_ANSWER_TEXT = "Нет ответа";
export const REJECTED_TEXT = "Вызов отклонён";
export const CANCELED_TEXT = "Вызов отменён";
export const MEDIA_DENIED_TEXT = "Нет доступа к камере и микрофону";
export const SCREEN_SHARE_BUSY_TEXT = "Собеседник уже демонстрирует экран";

export const CONNECTING_MESSAGE: CallStatusMessage = {
  kind: "info",
  text: "Соединение…",
};

export const MEDIA_DENIED_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: MEDIA_DENIED_TEXT,
};
