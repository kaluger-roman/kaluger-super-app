import type { CallerKindValue, CallSignalingOutbound } from "../../types";
import type { CALL_SIGNAL_TYPES } from "./signaling.constants";

export type OutboundSender = (
  kind: CallerKindValue,
  id: string,
  message: CallSignalingOutbound
) => void;

export type CallSignalType = (typeof CALL_SIGNAL_TYPES)[number];
