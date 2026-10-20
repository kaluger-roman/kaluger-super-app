import { invalidateCachedTokenVersion, setCachedTokenVersion } from "./tokenVersionCache";
import { getWebSocketManager } from "./wsManager";

// Everything that must follow a tutor's tokenVersion bump: the cache stops serving the old
// version (primed with the new one, or cleared when no fresh token is issued) and the live
// socket opened with an old token is closed.
export const revokeTutorSessions = (userId: string, tokenVersion: number | null): void => {
  if (tokenVersion === null) {
    invalidateCachedTokenVersion(userId);
  } else {
    setCachedTokenVersion(userId, tokenVersion);
  }
  getWebSocketManager()?.disconnectUser(userId);
};
