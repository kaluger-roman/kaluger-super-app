// A socket that does not answer call_sync within this time is dead (iOS keeps a socket "open"
// after sleep) and is opened again.
export const CALL_STATE_REPLY_TIMEOUT_MS = 3000;
