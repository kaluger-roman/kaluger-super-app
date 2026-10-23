export const WS_RECONNECT_DELAY_MS = 5000;
// The server closes with it when another tab or device of the same user holds the connection.
export const WS_HELD_ELSEWHERE_CLOSE_CODE = 4000;
// The server closes a socket that waited for a call in another tab with it once that call is over.
export const WS_CALL_ENDED_CLOSE_CODE = 4003;
// The server closes with these when the token is invalid or was revoked (password/email change).
export const WS_REVOKED_CLOSE_CODES: ReadonlySet<number> = new Set([1008, 4001]);
export const NO_REVOKED_CLOSE_CODES: ReadonlySet<number> = new Set();
