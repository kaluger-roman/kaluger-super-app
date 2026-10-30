import { parse } from "url";
import { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { hasCallHeldByConnection, isCallAwaitingReturnOf } from "../../services/callSignaling";
import type { CallerKindValue } from "../../types";
import {
  CONNECTION_READY_MESSAGE,
  REPLACED_CLOSE_CODE,
  TAB_ID_PATTERN,
} from "./connection.constants";
import type { TabSocket, TakeoverDecision } from "./types";

// An automatic reconnect (`resume=1`) must not take the connection from another live tab of the
// same user; only a fresh page load or an explicit take-over replaces it.
const isResumeRequest = (request: IncomingMessage): boolean =>
  parse(request.url ?? "", true).query.resume === "1";

// The id a page generates once per load; a malformed one counts as absent.
export const readTabId = (request: IncomingMessage): string | undefined => {
  const tab = parse(request.url ?? "", true).query.tab;
  return typeof tab === "string" && TAB_ID_PATTERN.test(tab) ? tab : undefined;
};

// A live socket keeps the connection while it holds its user's call, so opening another tab never
// drops the call: the new socket waits for the call to end. Otherwise (also while an incoming call
// still rings) an automatic reconnect leaves the live socket alone and a fresh connect takes over;
// while the call waits for its participant to come back, a reconnect of the page that held the call
// takes over as well, so it gets the call back from a tab that never picked it up.
// The same tab reconnecting replaces its own socket, which the server may still see as open after
// the network dropped.
export const toTakeoverDecision = (
  kind: CallerKindValue,
  id: string,
  previous: TabSocket | undefined,
  ws: TabSocket,
  request: IncomingMessage
): TakeoverDecision => {
  if (!previous || previous === ws || previous.readyState !== WebSocket.OPEN) {
    return { action: "register" };
  }
  if (ws.tabId !== undefined && previous.tabId === ws.tabId) return { action: "register" };
  if (hasCallHeldByConnection(kind, id)) return { action: "wait" };
  if (isResumeRequest(request) && !isCallAwaitingReturnOf(kind, id, ws.tabId)) {
    return {
      action: "refuse",
      code: REPLACED_CLOSE_CODE,
      reason: "Connection held by another tab",
    };
  }
  return { action: "register" };
};

export const closeSafely = (ws: WebSocket, code: number, reason: string): void => {
  try {
    ws.close(code, reason);
  } catch (error) {
    console.error("Error closing WebSocket:", error);
  }
};

export const sendConnectionReady = (ws: WebSocket): void => {
  try {
    ws.send(CONNECTION_READY_MESSAGE);
  } catch (error) {
    console.error("Failed to send connection_ready:", error);
  }
};
