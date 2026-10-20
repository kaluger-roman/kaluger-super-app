import type { CallMediaState } from "../videoCall.types";
import type { CallSignalRoutingContext } from "./call.types";
import type { CallSignalingOutbound } from "./signaling.types";

export const isSignalOf =
  <T extends CallSignalingOutbound["type"]>(type: T) =>
  (message: CallSignalingOutbound): message is Extract<CallSignalingOutbound, { type: T }> =>
    message.type === type;

export const isCurrentCall = (context: CallSignalRoutingContext, message: { callId: string }) =>
  context.callId !== null && context.callId === message.callId;

export const isAwaitingRinging = (context: CallSignalRoutingContext) =>
  context.phase === "outgoing" && context.callId === null;

// While our own invite still waits for call_ringing the server has picked the peer's
// call as the survivor of a glare, so we take it and let our invite end with call_busy.
export const canTakeIncoming = (context: CallSignalRoutingContext) =>
  context.phase === "idle" || isAwaitingRinging(context);

export const isOutgoing = (context: CallSignalRoutingContext) => context.phase === "outgoing";

export const isCallErrorForContext = (
  context: CallSignalRoutingContext,
  message: { callId?: string }
): boolean =>
  message.callId === undefined
    ? context.phase === "outgoing"
    : isCurrentCall(context, { callId: message.callId });

export const toPeerMediaState = (
  message: Extract<CallSignalingOutbound, { type: "call_media_state" }>
): CallMediaState => ({
  micOn: message.micOn,
  cameraOn: message.cameraOn,
  screenSharing: message.screenSharing,
  cameraAvailable: message.cameraAvailable ?? true,
});
