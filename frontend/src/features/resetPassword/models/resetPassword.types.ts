export type TokenStatus =
  | "idle"
  | "checking"
  | "valid"
  | "invalid_unknown"
  | "invalid_expired"
  | "invalid_used";
