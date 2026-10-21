import { createEffect, createEvent, sample } from "effector";

import { lessonModel } from "@entities/lesson";
import { changeEmailModel, changePasswordModel } from "@features";
import { getTutorToken } from "@shared";

import * as appInitModel from "./appInit.model";
import * as socketConnectionModel from "./socketConnection.model";
import { WS_RECONNECT_DELAY_MS, WS_REVOKED_CLOSE_CODES } from "./webSocket.constants";
import {
  dispatchTutorMessage,
  followStoredTutorToken,
  resumeTutorSession,
} from "./webSocket.helpers";
import type { LessonStatusUpdate } from "./webSocket.types";

// Events
export const handleLessonStatusUpdate = createEvent<LessonStatusUpdate>();
// The tutor token in localStorage was changed by another tab of this browser.
export const tokenStorageChanged = createEvent();

const connection = socketConnectionModel.createSocketConnection({
  path: "/ws",
  role: "tutor",
  getToken: getTutorToken,
  dispatch: (raw) => dispatchTutorMessage(raw, handleLessonStatusUpdate),
  reconnectDelayMs: WS_RECONNECT_DELAY_MS,
  resumed: appInitModel.appResumed,
  logLabel: "WebSocket",
  revokedCloseCodes: WS_REVOKED_CLOSE_CODES,
  canResume: resumeTutorSession,
});

const followStoredTokenFx = createEffect(followStoredTutorToken);

export const connectWebSocket = connection.connect;
export const disconnectWebSocket = connection.disconnect;
export const webSocketReady = connection.ready;
export const webSocketClosed = connection.closed;
export const connectWebSocketFx = connection.connectFx;

// Stores
export const $webSocketConnection = connection.$connection;
export const $isWebSocketConnected = connection.$isConnected;
export const $isWebSocketEnabled = connection.$isEnabled;
// Another tab or device of the same tutor holds the connection; this tab waits to be taken back.
export const $elsewhere = connection.$elsewhere;

// Logic
sample({ clock: tokenStorageChanged, fn: () => undefined, target: followStoredTokenFx });
const storedTokenFollowed = sample({ clock: followStoredTokenFx.doneData, filter: Boolean });

sample({
  clock: [
    storedTokenFollowed,
    changePasswordModel.persistTokenFx.done,
    changeEmailModel.persistTokenFx.done,
  ],
  fn: () => undefined,
  target: connection.tokenRenewed,
});

// The server already saved the status; refetch the lesson instead of writing it back.
sample({
  clock: handleLessonStatusUpdate,
  fn: ({ lessonId }) => lessonId,
  target: lessonModel.syncLessonFx,
});
