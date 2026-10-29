import { CONNECTING_TEXT, RECONNECTING_TEXT } from "../videoCall.constants";

// The own connection is the more urgent news: while it is lost the call cannot connect anyway.
export const getCallBannerText = (
  isConnecting: boolean,
  isOwnTransportLost: boolean
): string | null => {
  if (isOwnTransportLost) return RECONNECTING_TEXT;
  return isConnecting ? CONNECTING_TEXT : null;
};
