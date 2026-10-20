import * as callModel from "./call.model";
import { CALL_SIGNAL_OUTBOUND_TYPES } from "./signaling.constants";
import type { CallRole, CallSignalingInbound, CallSignalingOutbound } from "./signaling.types";
import { rememberCallRole, sendOverTransport } from "./transport.helpers";

export const sendCallSignal = (message: CallSignalingInbound): void => {
  sendOverTransport(message);
};

export const isCallSignalOutbound = (value: unknown): value is CallSignalingOutbound["type"] =>
  typeof value === "string" && (CALL_SIGNAL_OUTBOUND_TYPES as readonly string[]).includes(value);

export const dispatchCallSignal = (
  message: CallSignalingOutbound,
  role: CallRole = "tutor"
): void => {
  if ("callId" in message && message.callId) rememberCallRole(message.callId, role);
  callModel.signalReceived(message);
};
