import { createEvent, createStore, sample } from "effector";

import { isPendingConfirm } from "./call.helpers";
import * as callModel from "./call.model";
import type { StartCallParams } from "./call.types";
import * as callRequestModel from "./callRequest.model";

export const $isOpen = createStore(false);
// Kept after closing, so the dialog does not flash an empty name while it fades out.
export const $call = createStore<StartCallParams | null>(null);

export const callRequested = createEvent<StartCallParams>();
export const confirmDismissed = createEvent();
export const callConfirmed = createEvent();

// Fires once per opened dialog: a second click arrives when the dialog is already closed.
export const confirmed = sample({
  clock: callConfirmed,
  source: { isOpen: $isOpen, call: $call },
  filter: isPendingConfirm,
  fn: ({ call }) => call,
});

sample({ clock: callRequested, target: $call });
sample({ clock: callRequested, fn: () => true, target: $isOpen });
sample({
  clock: [confirmDismissed, confirmed, callModel.incomingCallReceived],
  fn: () => false,
  target: $isOpen,
});
sample({ clock: confirmed, target: callRequestModel.callRequested });
