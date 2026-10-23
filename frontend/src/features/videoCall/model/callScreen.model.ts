import { createStore, sample } from "effector";
import { delay } from "patronum";

import { OUTGOING_REVEAL_DELAY_MS } from "./call.constants";
import * as callModel from "./call.model";
import type { CallPhase } from "./call.types";

// The phase the call screen and its sounds follow: a just-started call stays unseen until the
// server confirmed it rings, or after a short wait on a slow network.
export const $shownCallPhase = createStore<CallPhase>("idle");
const $isOutgoingRevealed = createStore(false);
const $outgoingAttempt = createStore(0);

const outgoingStarted = sample({
  clock: callModel.callStarted,
  source: $outgoingAttempt,
  fn: (attempt) => attempt + 1,
});
sample({ clock: outgoingStarted, target: $outgoingAttempt });
sample({ clock: outgoingStarted, fn: () => false, target: $isOutgoingRevealed });
sample({ clock: callModel.callRinging, fn: () => true, target: $isOutgoingRevealed });
// patronum `delay` cannot be cancelled: a reveal is honored only for the attempt still dialing.
sample({
  clock: delay({ source: outgoingStarted, timeout: OUTGOING_REVEAL_DELAY_MS }),
  source: { attempt: $outgoingAttempt, phase: callModel.$callPhase },
  filter: ({ attempt, phase }, started) => attempt === started && phase === "outgoing",
  fn: () => true,
  target: $isOutgoingRevealed,
});

sample({
  clock: [callModel.$callPhase, $isOutgoingRevealed],
  source: { phase: callModel.$callPhase, revealed: $isOutgoingRevealed },
  fn: ({ phase, revealed }): CallPhase => (phase === "outgoing" && !revealed ? "idle" : phase),
  target: $shownCallPhase,
});
