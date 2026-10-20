import type { CALL_SIGNAL_TYPES } from "./signaling.constants";

export type CallSignalType = (typeof CALL_SIGNAL_TYPES)[number];
