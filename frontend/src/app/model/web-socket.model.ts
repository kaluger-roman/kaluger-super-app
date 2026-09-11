import { createStore, createEvent, createEffect, sample } from "effector";
import { delay } from "patronum";

import { lessonModel } from "@entities/lesson";
import { resolveWsUrl } from "@shared";
import type { LessonStatus } from "@shared/types";

import { WS_RECONNECT_DELAY_MS } from "./web-socket.constants";

// Events
export const connectWebSocket = createEvent();
export const disconnectWebSocket = createEvent();
export const webSocketClosed = createEvent();
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
    setWebSocketConnection(ws);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

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

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    setWebSocketConnection(null);
    webSocketClosed();
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return ws;
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

const $isReconnectScheduled = createStore(false);
// patronum `delay` cannot be cancelled. Every explicit connect/disconnect bumps
// the generation, and a fired reconnect is honored only if its generation is
// still current — otherwise logout + login inside the delay opens a second socket.
const $reconnectGeneration = createStore(0);

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
sample({
  clock: handleLessonStatusUpdate,
  fn: ({ lessonId, status }: { lessonId: string; status: string }) => {
    console.log(`Lesson ${lessonId} status updated to ${status} via WebSocket`);
    return {
      id: lessonId,
      data: { status: status as LessonStatus },
    };
  },
  target: lessonModel.updateLesson,
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
  filter: ({ isEnabled, isScheduled }) => isEnabled && !isScheduled,
  fn: ({ generation }) => generation,
});

sample({
  clock: reconnectScheduled,
  fn: () => true,
  target: $isReconnectScheduled,
});

const reconnectDelayPassed = delay({ source: reconnectScheduled, timeout: WS_RECONNECT_DELAY_MS });

sample({
  clock: reconnectDelayPassed,
  source: { isEnabled: $isWebSocketEnabled, generation: $reconnectGeneration },
  filter: ({ isEnabled, generation }, scheduledGeneration) =>
    isEnabled && generation === scheduledGeneration,
  fn: () => undefined,
  target: connectWebSocket,
});
