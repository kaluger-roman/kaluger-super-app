import { createStore, createEvent, createEffect, sample } from "effector";
import { delay } from "patronum";

import { lessonModel } from "@entities/lesson";
import { changeEmailModel, changePasswordModel } from "@features";
import {
  callModel,
  clearCallTransport,
  dispatchCallSignal,
  parseCallSignal,
  setCallTransport,
} from "@features/videoCall";
import { expireTutorSession, getTutorToken, resolveWsUrl } from "@shared";

import {
  WS_RECONNECT_DELAY_MS,
  WS_REPLACED_CLOSE_CODE,
  WS_REVOKED_CLOSE_CODES,
} from "./webSocket.constants";
import type { WebSocketClose } from "./webSocket.types";

// Events
export const connectWebSocket = createEvent();
export const disconnectWebSocket = createEvent();
export const webSocketClosed = createEvent<WebSocketClose>();
export const handleLessonStatusUpdate = createEvent<{
  lessonId: string;
  status: string;
}>();

// Effects
export const connectWebSocketFx = createEffect(() => {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const ws = new WebSocket(`${resolveWsUrl("/ws")}?token=${token}`);

  ws.onopen = () => {
    console.log("WebSocket connected");
    setCallTransport("tutor", (message) => ws.send(JSON.stringify(message)), ws);
    setWebSocketConnection(ws);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      const callSignal = parseCallSignal(data);
      if (callSignal) {
        dispatchCallSignal(callSignal, "tutor");
        return;
      }

      if (data.type === "lesson_status_updated") {
        handleLessonStatusUpdate({
          lessonId: data.lessonId,
          status: data.status,
        });
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
    }
  };

  ws.onclose = (event) => {
    console.log("WebSocket disconnected");
    const lostRole = clearCallTransport(ws);
    if (lostRole) callModel.transportDisconnected(lostRole);
    setWebSocketConnection(null);
    webSocketClosed({
      revokedToken: WS_REVOKED_CLOSE_CODES.has(event.code) ? token : null,
      replaced: event.code === WS_REPLACED_CLOSE_CODE,
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
export const $isReplacedElsewhere = createStore(false);

const $isReconnectScheduled = createStore(false);
// patronum `delay` cannot be cancelled. Every explicit connect/disconnect bumps
// the generation, and a fired reconnect is honored only if its generation is
// still current — otherwise logout + login inside the delay opens a second socket.
const $reconnectGeneration = createStore(0);
const $revokedToken = createStore<string | null>(null);

// Store setters
export const setWebSocketConnection = createEvent<WebSocket | null>();

// Logic
sample({
  clock: setWebSocketConnection,
  target: $webSocketConnection,
});

sample({
  clock: connectWebSocket,
  fn: () => true,
  target: $isWebSocketEnabled,
});

sample({
  clock: disconnectWebSocket,
  fn: () => false,
  target: $isWebSocketEnabled,
});

sample({
  clock: connectWebSocket,
  target: connectWebSocketFx,
});

sample({
  clock: disconnectWebSocket,
  source: $webSocketConnection,
  target: disconnectWebSocketFx,
});
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
  clock: [connectWebSocket, disconnectWebSocket],
  source: $reconnectGeneration,
  fn: (generation) => generation + 1,
  target: $reconnectGeneration,
});

sample({
  clock: [connectWebSocket, disconnectWebSocket],
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
  filter: ({ isEnabled, isScheduled }, { replaced }) => isEnabled && !isScheduled && !replaced,
  fn: ({ generation }) => generation,
});

sample({
  clock: webSocketClosed,
  fn: ({ replaced }) => replaced,
  target: $isReplacedElsewhere,
});
sample({
  clock: [connectWebSocket, disconnectWebSocket],
  fn: () => false,
  target: $isReplacedElsewhere,
});

sample({
  clock: reconnectScheduled,
  fn: () => true,
  target: $isReconnectScheduled,
});
sample({
  clock: webSocketClosed,
  fn: ({ revokedToken }) => revokedToken,
  target: $revokedToken,
});
sample({ clock: connectWebSocket, fn: () => null, target: $revokedToken });

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
  ],
  source: { revokedToken: $revokedToken, isScheduled: $isReconnectScheduled },
  filter: ({ revokedToken, isScheduled }, renewed) =>
    renewed && isScheduled && revokedToken !== null,
  fn: () => undefined,
  target: connectWebSocket,
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
  target: connectWebSocket,
});
