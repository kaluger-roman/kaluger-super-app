import { createStore, createEvent, createEffect, sample } from "effector";
import { delay } from "patronum";

import { lessonModel } from "@entities/lesson";
import { changeEmailModel, changePasswordModel } from "@features";
import { callModel, clearCallTransport, setCallTransport } from "@features/videoCall";
import { expireTutorSession, getTutorToken, isPageVisible, resolveWsUrl } from "@shared";

import * as appInitModel from "./appInit.model";
import {
  WS_ELSEWHERE_CLOSE_CODES,
  WS_RECONNECT_DELAY_MS,
  WS_REVOKED_CLOSE_CODES,
} from "./webSocket.constants";
import { dispatchTutorMessage } from "./webSocket.helpers";
import type { ElsewhereReason, LessonStatusUpdate, WebSocketClose } from "./webSocket.types";

// Events
export const connectWebSocket = createEvent();
export const disconnectWebSocket = createEvent();
export const webSocketClosed = createEvent<WebSocketClose>();
// The tutor token in localStorage was changed by another tab of this browser.
export const tokenStorageChanged = createEvent();
export const handleLessonStatusUpdate = createEvent<LessonStatusUpdate>();

// Effects
// `resume` marks an automatic reconnect: the server then keeps another tab's live socket
// instead of handing the connection to this tab.
export const connectWebSocketFx = createEffect((resume: boolean) => {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const ws = new WebSocket(`${resolveWsUrl("/ws")}?token=${token}${resume ? "&resume=1" : ""}`);

  ws.onopen = () => {
    console.log("WebSocket connected");
    setCallTransport("tutor", (message) => ws.send(JSON.stringify(message)), ws);
    setWebSocketConnection(ws);
  };

  ws.onmessage = (event) => {
    dispatchTutorMessage(event.data, handleLessonStatusUpdate);
  };

  ws.onclose = (event) => {
    console.log("WebSocket disconnected");
    const lostRole = clearCallTransport(ws);
    if (lostRole) callModel.transportDisconnected(lostRole);
    setWebSocketConnection(null);
    webSocketClosed({
      revokedToken: WS_REVOKED_CLOSE_CODES.has(event.code) ? token : null,
      elsewhere: WS_ELSEWHERE_CLOSE_CODES.get(event.code) ?? null,
    });
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return ws;
});

// A socket closed for a revoked token reconnects only if this tab got a new token meanwhile
// (its own password change); otherwise the session is over.
const isTokenReplacedFx = createEffect(
  (revokedToken: string): boolean => getTutorToken() !== revokedToken
);

const resumeAfterCloseFx = createEffect((revokedToken: string | null): boolean => {
  if (revokedToken === null || getTutorToken() !== revokedToken) return true;
  expireTutorSession();
  return false;
});

// A hidden tab waits until it is shown, so after a server restart the tab in use reconnects
// first and keeps the connection.
const isPageVisibleFx = createEffect((): boolean => isPageVisible());

export const disconnectWebSocketFx = createEffect((ws: WebSocket | null) => {
  if (ws) {
    ws.close();
  }
});

// Stores
export const $webSocketConnection = createStore<WebSocket | null>(null);

export const $isWebSocketConnected = $webSocketConnection.map(
  (connection) => connection?.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)
);

export const $isWebSocketEnabled = createStore(true);
// Another tab or device of the same user holds the connection; this tab waits to be taken back.
export const $elsewhere = createStore<ElsewhereReason | null>(null);

const $isReconnectScheduled = createStore(false);
// patronum `delay` cannot be cancelled. Every explicit connect/disconnect bumps
// the generation, and a fired reconnect is honored only if its generation is
// still current — otherwise logout + login inside the delay opens a second socket.
const $reconnectGeneration = createStore(0);
const $revokedToken = createStore<string | null>(null);
const $isReconnectDeferred = createStore(false);

// true for an automatic reconnect, false for an explicit connect.
const socketOpenRequested = createEvent<boolean>();

// Store setters
export const setWebSocketConnection = createEvent<WebSocket | null>();

// Logic
sample({ clock: setWebSocketConnection, target: $webSocketConnection });

sample({ clock: connectWebSocket, fn: () => true, target: $isWebSocketEnabled });

sample({ clock: disconnectWebSocket, fn: () => false, target: $isWebSocketEnabled });

sample({ clock: connectWebSocket, fn: () => false, target: socketOpenRequested });
sample({ clock: socketOpenRequested, target: connectWebSocketFx });

sample({ clock: disconnectWebSocket, source: $webSocketConnection, target: disconnectWebSocketFx });
// Handle lesson status updates from WebSocket
// The server already saved the status; refetch the lesson instead of writing it back.
sample({
  clock: handleLessonStatusUpdate,
  fn: ({ lessonId }) => lessonId,
  target: lessonModel.syncLessonFx,
});

// Reconnect after WS_RECONNECT_DELAY_MS if WebSocket is still enabled.
// Close events arriving while a reconnect is already scheduled are collapsed.
sample({
  clock: [socketOpenRequested, disconnectWebSocket],
  source: $reconnectGeneration,
  fn: (generation) => generation + 1,
  target: $reconnectGeneration,
});

sample({
  clock: [socketOpenRequested, disconnectWebSocket],
  fn: () => false,
  target: $isReconnectScheduled,
});

const reconnectScheduled = sample({
  clock: webSocketClosed,
  source: {
    isEnabled: $isWebSocketEnabled,
    isScheduled: $isReconnectScheduled,
    generation: $reconnectGeneration,
  },
  filter: ({ isEnabled, isScheduled }, { elsewhere }) => isEnabled && !isScheduled && !elsewhere,
  fn: ({ generation }) => generation,
});

sample({ clock: webSocketClosed, fn: ({ elsewhere }) => elsewhere, target: $elsewhere });
// Cleared only once this tab holds the connection again, so a failed retry does not flicker.
sample({
  clock: setWebSocketConnection,
  filter: (ws) => ws !== null,
  fn: () => null,
  target: $elsewhere,
});
sample({ clock: disconnectWebSocket, fn: () => null, target: $elsewhere });
// Coming back to the tab retries: if the holder tab was closed meanwhile, this one takes over.
sample({
  clock: appInitModel.appResumed,
  source: { elsewhere: $elsewhere, isEnabled: $isWebSocketEnabled },
  filter: ({ elsewhere, isEnabled }) => elsewhere !== null && isEnabled,
  fn: () => true,
  target: socketOpenRequested,
});

sample({ clock: reconnectScheduled, fn: () => true, target: $isReconnectScheduled });
sample({ clock: webSocketClosed, fn: ({ revokedToken }) => revokedToken, target: $revokedToken });
sample({ clock: socketOpenRequested, fn: () => null, target: $revokedToken });

// The own password or email change revokes this tab's socket too; with the new token already
// stored it reconnects at once instead of after the delay.
const revokedTokenOnClose = sample({
  clock: webSocketClosed,
  fn: ({ revokedToken }) => revokedToken,
});
sample({
  clock: revokedTokenOnClose,
  filter: (token): token is string => token !== null,
  target: isTokenReplacedFx,
});
sample({
  clock: [
    isTokenReplacedFx.doneData,
    changePasswordModel.persistTokenFx.done.map(() => true),
    changeEmailModel.persistTokenFx.done.map(() => true),
    tokenStorageChanged.map(() => true),
  ],
  source: { revokedToken: $revokedToken, isScheduled: $isReconnectScheduled },
  filter: ({ revokedToken, isScheduled }, renewed) =>
    renewed && isScheduled && revokedToken !== null,
  fn: () => true,
  target: socketOpenRequested,
});

const reconnectDelayPassed = delay({ source: reconnectScheduled, timeout: WS_RECONNECT_DELAY_MS });

sample({
  clock: reconnectDelayPassed,
  source: {
    isEnabled: $isWebSocketEnabled,
    generation: $reconnectGeneration,
    revokedToken: $revokedToken,
  },
  filter: ({ isEnabled, generation }, scheduledGeneration) =>
    isEnabled && generation === scheduledGeneration,
  fn: ({ revokedToken }) => revokedToken,
  target: resumeAfterCloseFx,
});

sample({
  clock: resumeAfterCloseFx.doneData,
  filter: Boolean,
  fn: () => undefined,
  target: isPageVisibleFx,
});
sample({
  clock: isPageVisibleFx.doneData,
  filter: Boolean,
  fn: () => true,
  target: socketOpenRequested,
});
sample({
  clock: isPageVisibleFx.doneData,
  fn: (visible) => !visible,
  target: $isReconnectDeferred,
});
sample({
  clock: [socketOpenRequested, disconnectWebSocket],
  fn: () => false,
  target: $isReconnectDeferred,
});
sample({
  clock: appInitModel.appResumed,
  source: { isDeferred: $isReconnectDeferred, isEnabled: $isWebSocketEnabled },
  filter: ({ isDeferred, isEnabled }) => isDeferred && isEnabled,
  fn: () => true,
  target: socketOpenRequested,
});
