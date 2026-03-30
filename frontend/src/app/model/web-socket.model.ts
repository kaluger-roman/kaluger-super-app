import { createStore, createEvent, createEffect, sample } from "effector";

import { lessonModel } from "@entities/lesson";
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

  const wsUrl =
    process.env.NODE_ENV === "production"
      ? `wss://${window.location.host}/ws`
      : "ws://localhost:3001/ws";

  const ws = new WebSocket(`${wsUrl}?token=${token}`);

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

// Reconnect after 5 seconds if WebSocket is enabled
const reconnectTimeoutFx = createEffect(() => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 5000);
  });
});

sample({
  clock: webSocketClosed,
  source: $isWebSocketEnabled,
  filter: (isEnabled) => isEnabled,
  target: reconnectTimeoutFx,
});

sample({
  clock: reconnectTimeoutFx.doneData,
  target: connectWebSocket,
});
