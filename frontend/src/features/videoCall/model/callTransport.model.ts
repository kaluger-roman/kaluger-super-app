import { createEffect, createEvent, sample } from "effector";

import { NO_TRANSPORT_TEXT } from "./call.constants";
import * as callModel from "./call.model";
import type { AddressedSignal } from "./call.types";
import * as currentCallModel from "./currentCall.model";
import { sendOverTransport } from "./transport.helpers";

export const sendCallSignalFx = createEffect(({ role, message }: AddressedSignal): void => {
  sendOverTransport(role, message);
});

// Fire-and-forget send for code that must not see a missing socket as its own failure:
// the failure is handled once, below.
export const signalQueued = createEvent<AddressedSignal>();

sample({ clock: signalQueued, target: sendCallSignalFx });

// A signal the current call cannot do without ends it. Signals of another call, or of a call
// already over here, need no handling: the server ends that call when its socket closes.
sample({
  clock: currentCallModel.forCurrentCall(sendCallSignalFx.fail, ({ params: { message } }) =>
    "callId" in message ? message.callId : null
  ),
  fn: () => NO_TRANSPORT_TEXT,
  target: callModel.callFailed,
});
