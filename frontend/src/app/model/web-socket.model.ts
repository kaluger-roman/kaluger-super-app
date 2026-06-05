import { createStore, createEvent, createEffect, sample } from "effector";

import { lessonModel } from "@entities/lesson";
import { resolveWsUrl } from "@shared";
import { LessonStatus } from "@shared/types";

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

// Reconnect after 5 seconds if WebSocket is enabled.
// Exported so tests can override its handler via `fork({ handlers: ... })`
// without dealing with the global setTimeout / WebSocket mock plumbing.
export const reconnectTimeoutFx = createEffect(() => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 5000);
  });
});

sample({
  clock: webSocketClosed,
  source: { isEnabled: $isWebSocketEnabled, pending: reconnectTimeoutFx.pending },
  filter: ({ isEnabled, pending }) => isEnabled && !pending,
  fn: () => undefined,
  target: reconnectTimeoutFx,
});

sample({
  clock: reconnectTimeoutFx.doneData,
  source: $isWebSocketEnabled,
  filter: (isEnabled) => isEnabled,
  fn: () => undefined,
  target: connectWebSocket,
});
