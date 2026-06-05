import type { CallMediaState } from "../videoCall.types";
import type { CallPeer, CallStatusMessage, StartCallParams } from "./call.types";

export const toOutgoingPeer = (params: StartCallParams): CallPeer =>
  "studentId" in params
    ? { id: params.studentId, name: params.peerName, role: "student" }
    : { id: "", name: params.peerName, role: "tutor" };

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

export const UNAVAILABLE_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: "Собеседник сейчас не в сети",
};

export const CONNECTING_MESSAGE: CallStatusMessage = {
  kind: "info",
  text: "Соединение…",
};

export const BUSY_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: "Абонент занят",
};

export const NO_ANSWER_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: "Нет ответа",
};

export const REJECTED_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: "Вызов отклонён",
};

export const CANCELED_MESSAGE: CallStatusMessage = {
  kind: "info",
  text: "Вызов отменён",
};

export const MEDIA_DENIED_MESSAGE: CallStatusMessage = {
  kind: "error",
  text: "Нет доступа к камере и микрофону",
};

export const SCREEN_SHARE_BUSY_MESSAGE: CallStatusMessage = {
  kind: "info",
  text: "Собеседник уже демонстрирует экран",
};

export const toErrorMessage = (text: string): CallStatusMessage => ({
  kind: "error",
  text,
});
