import { resolveWsUrl } from "@shared";

import type { SocketClosedPayload } from "./socketConnection.types";
import { WS_ELSEWHERE_CLOSE_CODES } from "./webSocket.constants";
import type { WebSocketClose } from "./webSocket.types";

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

// The server sends it once the socket is registered; a refused socket opens but never gets it.
export const isConnectionReadyMessage = (raw: unknown): boolean => {
  if (typeof raw !== "string") return false;
  try {
    const data: unknown = JSON.parse(raw);
    return (
      typeof data === "object" &&
      data !== null &&
      (data as { type?: unknown }).type === "connection_ready"
    );
  } catch {
    return false;
  }
};

export const toSocketClose = (
  { code, token }: SocketClosedPayload,
  revokedCloseCodes: ReadonlySet<number>
): WebSocketClose => ({
  revokedToken: revokedCloseCodes.has(code) ? token : null,
  elsewhere: WS_ELSEWHERE_CLOSE_CODES.get(code) ?? null,
});
