import { isRecord, resolveWsUrl } from "@shared";

import type { SocketClosedPayload, SocketControlMessage } from "./socketConnection.types";
import { WS_CALL_ENDED_CLOSE_CODE, WS_HELD_ELSEWHERE_CLOSE_CODE } from "./webSocket.constants";
import type { ElsewhereReason, WebSocketClose } from "./webSocket.types";

// One id per page load: the server lets a tab replace its own socket that still looks alive to it.
let tabId: string | null = null;

const createTabId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const getTabId = (): string => {
  tabId ??= createTabId();
  return tabId;
};

export const buildSocketUrl = (path: string, token: string, resume: boolean): string => {
  const params = new URLSearchParams({ token, tab: getTabId() });
  if (resume) params.set("resume", "1");
  return `${resolveWsUrl(path)}?${params.toString()}`;
};

// undefined when the message is not JSON (logged and dropped).
export const parseSocketMessage = (raw: unknown, logLabel: string): unknown => {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : undefined;
  } catch (error) {
    console.error(`${logLabel} message parsing error:`, error);
    return undefined;
  }
};

export const toControlMessage = (data: unknown): SocketControlMessage | null => {
  if (!isRecord(data)) return null;
  if (data.type === "connection_ready") return "ready";
  if (data.type === "connection_waiting") return "waiting";
  return null;
};

// A tab that waited for a call elsewhere is not the holder: when its socket drops it does not
// race the holder for the connection, and after the call ended it keeps waiting until the
// retry is answered, so the banner does not blink empty.
export const toSocketClose = (
  { code, token }: SocketClosedPayload,
  revokedCloseCodes: ReadonlySet<number>,
  previous: ElsewhereReason | null
): WebSocketClose => {
  const isRevoked = revokedCloseCodes.has(code);
  const callEnded = code === WS_CALL_ENDED_CLOSE_CODE;
  let elsewhere: ElsewhereReason | null = null;
  if (code === WS_HELD_ELSEWHERE_CLOSE_CODE) elsewhere = "tab";
  else if (previous === "call" && !isRevoked) elsewhere = callEnded ? "call" : "tab";
  return { revokedToken: isRevoked ? token : null, elsewhere, callEnded };
};
