import type { CallerKindValue } from "../../types";
import {
  hasCallNotificationDevices,
  notifyCallClosed,
  notifyIncomingCall,
} from "../callNotification";
import type { CallNotificationKind, CallNotificationMessage } from "../callNotification";
import * as callRegistry from "./callSignaling";
import type { CallParticipant, LiveCall } from "./callSignaling.types";

const calleeOf = (call: LiveCall): CallParticipant => callRegistry.getPeer(call, call.callerKind);

const toMessage = (call: LiveCall, kind: CallNotificationKind): CallNotificationMessage => ({
  kind,
  callId: call.callId,
  callerName: call.callerKind === "tutor" ? call.tutorName : call.studentName,
  recipientKind: calleeOf(call).kind,
});

// A failed lookup must not keep an online callee from being called: it counts as no devices.
export const calleeHasDevices = async (callee: CallParticipant): Promise<boolean> => {
  try {
    return await hasCallNotificationDevices(callee);
  } catch (error) {
    console.error("Call notification devices lookup failed:", error);
    return false;
  }
};

// The callee's devices hear about a call once; resolves with how many took it.
export const pushIncomingCall = (call: LiveCall): Promise<number> =>
  callRegistry.notifyCalleeOnce(call.callId, () =>
    notifyIncomingCall(calleeOf(call), toMessage(call, "incoming_call"))
  );

// Replaces the incoming call notification on the callee's devices (FR-016). Sent only once the
// push service took the incoming one: a closing push that overtook it would leave the device
// ringing for a call that is over.
export const pushCallClosed = (
  call: LiveCall,
  kind: Exclude<CallNotificationKind, "incoming_call">
): void => {
  if (!callRegistry.takePushNotified(call)) return;
  const incoming = call.incomingPush ?? Promise.resolve(0);
  void incoming.then(() => notifyCallClosed(calleeOf(call), toMessage(call, kind)));
};

// A ringing call ended by the caller (or without the callee) was missed; one the callee ended
// was answered on some device.
export const pushRingingEnded = (call: LiveCall, endedBy: CallerKindValue): void => {
  if (call.status !== "ringing") return;
  pushCallClosed(call, endedBy === call.callerKind ? "missed_call" : "call_closed");
};
