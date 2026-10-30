import { createEvent, sample } from "effector";

import { toRejectSignal } from "./call.helpers";
import * as callModel from "./call.model";
import type { TerminalSignal, TerminatedCall } from "./call.types";
import * as devicePushModel from "./devicePush.model";

// The signal the own side owes the peer when the call ends here; null when it ended elsewhere.
const callEnding = createEvent<TerminalSignal | null>();

sample({
  clock: callModel.rejectCall,
  source: devicePushModel.$pushEndpoint,
  fn: toRejectSignal,
  target: callEnding,
});
sample({
  clock: callModel.cancelCall,
  fn: (): TerminalSignal => ({ type: "call_cancel" }),
  target: callEnding,
});
sample({
  clock: [callModel.hangUp, callModel.callFailed],
  fn: (): TerminalSignal => ({ type: "call_hangup" }),
  target: callEnding,
});
sample({
  clock: callModel.mediaAcquisitionFailed,
  fn: (): TerminalSignal => ({ type: "call_hangup", reason: "media_unavailable" }),
  target: callEnding,
});
sample({
  clock: [
    callModel.callEnded,
    callModel.unavailableReceived,
    callModel.busyReceived,
    callModel.noAnswerReceived,
    callModel.rejectedReceived,
    callModel.canceledReceived,
    callModel.callErrorReceived,
    callModel.callEndedLocally,
  ],
  fn: () => null,
  target: callEnding,
});
// The address is read once here, so the terminal signal still knows where to go after the reset.
sample({
  clock: callEnding,
  source: callModel.$callAddress,
  fn: (address, signal): TerminatedCall => ({ address, signal }),
  target: callModel.callTerminated,
});
