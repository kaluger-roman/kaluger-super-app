import { createStore, createEvent, createEffect } from "effector";
import { updateLesson } from "../../entities/lesson";

// Events
export const connectWebSocket = createEvent();
export const disconnectWebSocket = createEvent();
export const handleLessonUpdate = createEvent<any>();

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

      if (data.type === "lesson_updated") {
        handleLessonUpdate(data.lesson);
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
    }
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    setWebSocketConnection(null);

    // Автоматически переподключаемся через 5 секунд
    setTimeout(() => {
      if ($isWebSocketEnabled.getState()) {
        connectWebSocket();
      }
    }, 5000);
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
  (connection) => connection?.readyState === WebSocket.OPEN
);

export const $isWebSocketEnabled = createStore(true)
  .on(connectWebSocket, () => true)
  .on(disconnectWebSocket, () => false);

// Store setters
export const setWebSocketConnection = createEvent<WebSocket | null>();
$webSocketConnection.on(setWebSocketConnection, (_, connection) => connection);

// Connect events to effects
connectWebSocket.watch(connectWebSocketFx);
disconnectWebSocket.watch(() => {
  const connection = $webSocketConnection.getState();
  disconnectWebSocketFx(connection);
});

// Handle lesson updates from WebSocket
handleLessonUpdate.watch((lessonData) => {
  // Обновляем урок в локальном стейте
  updateLesson({
    id: lessonData.id,
    data: lessonData,
  });
});
