import { WebSocketManager } from "./websocket";

let wsManagerInstance: WebSocketManager | null = null;

export const setWebSocketManager = (manager: WebSocketManager) => {
  wsManagerInstance = manager;
};

export const getWebSocketManager = (): WebSocketManager | null => {
  return wsManagerInstance;
};
