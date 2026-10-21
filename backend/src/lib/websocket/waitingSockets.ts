import type { WebSocket } from "ws";
import type { CallerKindValue } from "../../types";
import {
  CONNECTION_WAITING_MESSAGE,
  MAX_WAITING_SOCKETS_PER_USER,
  REPLACED_CLOSE_CODE,
} from "./connection.constants";
import { closeSafely } from "./connection.helpers";

const keyOf = (kind: CallerKindValue, id: string): string => `${kind}:${id}`;

// Sockets opened while their user is in a call in another tab: kept open but unregistered (no
// lesson events, no call signals), and closed once the call ends so the tab asks again.
export const createWaitingSockets = () => {
  const waiting = new Map<string, WebSocket[]>();

  const drop = (key: string, ws: WebSocket): void => {
    const rest = (waiting.get(key) ?? []).filter((socket) => socket !== ws);
    if (rest.length > 0) waiting.set(key, rest);
    else waiting.delete(key);
  };

  const add = (kind: CallerKindValue, id: string, ws: WebSocket): void => {
    const key = keyOf(kind, id);
    const sockets = [...(waiting.get(key) ?? []), ws];
    const evicted = sockets.splice(0, Math.max(0, sockets.length - MAX_WAITING_SOCKETS_PER_USER));
    waiting.set(key, sockets);
    ws.on("close", () => drop(key, ws));
    evicted.forEach((old) =>
      closeSafely(old, REPLACED_CLOSE_CODE, "Connection held by another tab")
    );
    try {
      ws.send(CONNECTION_WAITING_MESSAGE);
    } catch (error) {
      console.error("Failed to send connection_waiting:", error);
    }
  };

  const release = (kind: CallerKindValue, id: string, code: number, reason: string): void => {
    const key = keyOf(kind, id);
    const sockets = waiting.get(key) ?? [];
    waiting.delete(key);
    sockets.forEach((ws) => closeSafely(ws, code, reason));
  };

  const all = (): WebSocket[] => Array.from(waiting.values()).flat();

  return { add, release, all };
};
