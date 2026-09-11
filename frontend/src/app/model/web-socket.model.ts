import { createStore, createEvent, createEffect, sample } from "effector";
import { delay } from "patronum";

import { lessonModel } from "@entities/lesson";
import { resolveWsUrl } from "@shared";
import type { LessonStatus } from "@shared/types";

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
export const WS_RECONNECT_DELAY_MS = 5000;

const $isReconnectScheduled = createStore(false);

const reconnectScheduled = sample({
  clock: webSocketClosed,
  source: { isEnabled: $isWebSocketEnabled, isScheduled: $isReconnectScheduled },
  filter: ({ isEnabled, isScheduled }) => isEnabled && !isScheduled,
  fn: () => undefined,
});

sample({
  clock: reconnectScheduled,
  fn: () => true,
  target: $isReconnectScheduled,
});

const reconnectDelayPassed = delay({ source: reconnectScheduled, timeout: WS_RECONNECT_DELAY_MS });

sample({
  clock: reconnectDelayPassed,
  fn: () => false,
  target: $isReconnectScheduled,
});

sample({
  clock: reconnectDelayPassed,
  source: $isWebSocketEnabled,
  filter: (isEnabled) => isEnabled,
  fn: () => undefined,
  target: connectWebSocket,
});
