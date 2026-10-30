import { createEffect, createEvent, sample } from "effector";

import { lessonModel } from "@entities/lesson";
import { changeEmailModel, changePasswordModel } from "@features";
import { callNotificationOpenModel } from "@features/videoCall";
import { expireTutorSession, getTutorToken } from "@shared";

import * as appInitModel from "./appInit.model";
import * as socketConnectionModel from "./socketConnection.model";
import { WS_RECONNECT_DELAY_MS, WS_REVOKED_CLOSE_CODES } from "./webSocket.constants";
import { dispatchTutorMessage, resumeTutorSession } from "./webSocket.helpers";
import type { LessonStatusUpdate } from "./webSocket.types";

export const handleLessonStatusUpdate = createEvent<LessonStatusUpdate>();
// The tutor token in localStorage was changed by another tab of this browser.
export const tokenStorageChanged = createEvent();
// Another tab of this browser logged the tutor out.
export const tutorSessionEndedElsewhere = createEvent();

const connection = socketConnectionModel.createSocketConnection({
  path: "/ws",
  role: "tutor",
  getToken: getTutorToken,
  dispatch: (data) => dispatchTutorMessage(data, handleLessonStatusUpdate),
  reconnectDelayMs: WS_RECONNECT_DELAY_MS,
  resumed: appInitModel.appResumed,
  online: appInitModel.wentOnline,
  openedForCall: callNotificationOpenModel.notificationOpenedInApp,
  logLabel: "WebSocket",
  revokedCloseCodes: WS_REVOKED_CLOSE_CODES,
  canResume: resumeTutorSession,
});

const hasTutorTokenFx = createEffect((): boolean => getTutorToken() !== null);
export const expireSessionFx = createEffect(expireTutorSession);

export const connectWebSocket = connection.connect;
export const disconnectWebSocket = connection.disconnect;
export const webSocketClosed = connection.closed;
export const connectWebSocketFx = connection.connectFx;

export const $webSocketConnection = connection.$connection;
export const $isWebSocketConnected = connection.$isConnected;
export const $isWebSocketEnabled = connection.$isEnabled;
// Another tab or device of the same tutor holds the connection; this tab waits to be taken back.
export const $elsewhere = connection.$elsewhere;

// Only a tab with a tutor session follows the tutor token (the student cabinet and public pages
// of the same browser stay as they are).
sample({
  clock: tokenStorageChanged,
  source: connection.$isEnabled,
  filter: Boolean,
  fn: () => undefined,
  target: hasTutorTokenFx,
});
sample({
  clock: hasTutorTokenFx.doneData,
  filter: Boolean,
  fn: () => undefined,
  target: connection.tokenRenewed,
});
sample({
  clock: hasTutorTokenFx.doneData,
  filter: (hasToken) => !hasToken,
  fn: () => undefined,
  target: tutorSessionEndedElsewhere,
});
sample({ clock: tutorSessionEndedElsewhere, target: expireSessionFx });
sample({
  clock: [changePasswordModel.persistTokenFx.done, changeEmailModel.persistTokenFx.done],
  fn: () => undefined,
  target: connection.tokenRenewedHere,
});

// The server already saved the status; refetch the lesson instead of writing it back.
sample({
  clock: handleLessonStatusUpdate,
  fn: ({ lessonId }) => lessonId,
  target: lessonModel.syncLessonFx,
});
