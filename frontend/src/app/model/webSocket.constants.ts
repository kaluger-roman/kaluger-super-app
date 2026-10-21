import type { ElsewhereReason } from "./webSocket.types";

export const WS_RECONNECT_DELAY_MS = 5000;
// The server closes with these when another tab or device of the same user holds the connection.
export const WS_ELSEWHERE_CLOSE_CODES: ReadonlyMap<number, ElsewhereReason> = new Map([
  [4000, "tab"],
  [4002, "call"],
]);
// The server closes with these when the token is invalid or was revoked (password/email change).
export const WS_REVOKED_CLOSE_CODES: ReadonlySet<number> = new Set([1008, 4001]);
