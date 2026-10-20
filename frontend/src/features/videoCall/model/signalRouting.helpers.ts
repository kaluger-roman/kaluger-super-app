import type { CallMediaState } from "../videoCall.types";
import type { CallSignalRoutingContext } from "./call.types";
import type { CallReplyTarget, CallSignalingOutbound, ReceivedSignal } from "./signaling.types";

export const isSignalOf =
  <T extends CallSignalingOutbound["type"]>(type: T) =>
  (
    signal: ReceivedSignal
  ): signal is ReceivedSignal & { message: Extract<CallSignalingOutbound, { type: T }> } =>
    signal.message.type === type;

export const isCurrentCall = (context: CallSignalRoutingContext, message: { callId: string }) =>
  context.callId !== null && context.callId === message.callId;

const isAwaitingRinging = (context: CallSignalRoutingContext) =>
  context.phase === "outgoing" && context.callId === null;

// While our own invite still waits for call_ringing the server has picked the peer's
// call as the survivor of a glare, so we take it and let our invite end with call_busy.
export const canTakeIncoming = (context: CallSignalRoutingContext) =>
  context.phase === "idle" || isAwaitingRinging(context);

export const isOutgoing = (context: CallSignalRoutingContext) => context.phase === "outgoing";

export const isOwnRinging = (context: CallSignalRoutingContext, message: { inviteId: string }) =>
  isAwaitingRinging(context) && context.inviteId === message.inviteId;

export const isReplyToCurrent = (context: CallSignalRoutingContext, target: CallReplyTarget) =>
  "callId" in target
    ? isCurrentCall(context, target)
    : isOutgoing(context) && context.inviteId === target.inviteId;

export const toPeerMediaState = (
  message: Extract<CallSignalingOutbound, { type: "call_media_state" }>
): CallMediaState => ({
  micOn: message.micOn,
  cameraOn: message.cameraOn,
  screenSharing: message.screenSharing,
  cameraAvailable: message.cameraAvailable,
});
