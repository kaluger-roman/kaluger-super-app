import {
  CALL_ID_QUERY_PARAM,
  CALL_NOTIFICATION_OPENED_MESSAGE,
} from "./callNotificationOpen.constants";

// Takes the call id out of the address, so a reload or a shared link does not open it again.
export const takeCallIdFromUrl = (): string | null => {
  const url = new URL(window.location.href);
  const callId = url.searchParams.get(CALL_ID_QUERY_PARAM);
  if (callId === null) return null;
  url.searchParams.delete(CALL_ID_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return callId || null;
};

export const readOpenedCallId = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) return null;
  if (!("type" in data) || data.type !== CALL_NOTIFICATION_OPENED_MESSAGE) return null;
  return "callId" in data && typeof data.callId === "string" && data.callId ? data.callId : null;
};
