export const WS_RECONNECT_DELAY_MS = 5000;
// The server closes with this when a newer tab or device of the same user takes over.
export const WS_REPLACED_CLOSE_CODE = 4000;
// The server closes with these when the token is invalid or was revoked (password/email change).
export const WS_REVOKED_CLOSE_CODES: ReadonlySet<number> = new Set([1008, 4001]);
