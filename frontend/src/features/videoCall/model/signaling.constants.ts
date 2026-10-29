export const CALL_END_REASONS = [
  "hangup",
  "peer_disconnected",
  "media_unavailable",
  "peer_not_returned",
] as const;
export const CALL_CANCEL_REASONS = ["canceled", "timeout"] as const;
export const CALL_SNAPSHOT_STATUSES = ["ringing", "accepted", "connected"] as const;
export const PEER_PRESENCES = ["on_screen", "background", "disconnected"] as const;
