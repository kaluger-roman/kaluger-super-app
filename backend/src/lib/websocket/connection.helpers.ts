import { parse } from "url";
import { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { hasActiveCall } from "../../services/callSignaling";
import type { CallerKindValue } from "../../types";
import {
  CALL_IN_PROGRESS_CLOSE_CODE,
  CONNECTION_READY_MESSAGE,
  REPLACED_CLOSE_CODE,
  TAB_ID_PATTERN,
} from "./connection.constants";
import type { TabSocket, TakeoverRefusal } from "./types";

// An automatic reconnect (`resume=1`) must not take the connection from another live tab of the
// same user; only a fresh page load or an explicit take-over replaces it.
const isResumeRequest = (request: IncomingMessage): boolean =>
  parse(request.url ?? "", true).query.resume === "1";

// The id a page generates once per load; a malformed one counts as absent.
export const readTabId = (request: IncomingMessage): string | undefined => {
  const tab = parse(request.url ?? "", true).query.tab;
  return typeof tab === "string" && TAB_ID_PATTERN.test(tab) ? tab : undefined;
};

// A live socket keeps the connection while its user is in a call, so opening another tab never
// drops the call; otherwise an automatic reconnect leaves it alone and a fresh connect takes over.
// The same tab reconnecting replaces its own socket, which the server may still see as open
// after the network dropped.
export const toTakeoverRefusal = (
  kind: CallerKindValue,
  id: string,
  previous: TabSocket | undefined,
  ws: TabSocket,
  request: IncomingMessage
): TakeoverRefusal | null => {
  if (!previous || previous === ws || previous.readyState !== WebSocket.OPEN) return null;
  if (ws.tabId !== undefined && previous.tabId === ws.tabId) return null;
  if (hasActiveCall(kind, id)) {
    return { code: CALL_IN_PROGRESS_CLOSE_CODE, reason: "Call in progress in another tab" };
  }
  if (isResumeRequest(request)) {
    return { code: REPLACED_CLOSE_CODE, reason: "Connection held by another tab" };
  }
  return null;
};

export const sendConnectionReady = (ws: WebSocket): void => {
  try {
    ws.send(CONNECTION_READY_MESSAGE);
  } catch (error) {
    console.error("Failed to send connection_ready:", error);
  }
};
