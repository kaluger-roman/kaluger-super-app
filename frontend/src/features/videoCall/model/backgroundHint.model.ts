import { combine, createEffect, createEvent, createStore, sample } from "effector";

import {
  isBackgroundHintShown,
  readHintDismissed,
  writeHintDismissed,
} from "./backgroundHint.helpers";
import * as callModel from "./call.model";
import * as callPresenceModel from "./callPresence.model";

// Hidden until the device's choice is read, so a dismissed hint never flashes.
export const $isHintDismissed = createStore(true);

export const $isBackgroundHintShown = combine(
  callModel.$callPhase,
  callPresenceModel.$backgroundCapability,
  $isHintDismissed,
  isBackgroundHintShown
);

export const backgroundHintDismissed = createEvent();

const readHintDismissedFx = createEffect(readHintDismissed);
const writeHintDismissedFx = createEffect(writeHintDismissed);

sample({
  clock: callModel.$callPhase.updates,
  filter: (phase) => phase === "active",
  fn: () => undefined,
  target: readHintDismissedFx,
});
sample({ clock: readHintDismissedFx.doneData, target: $isHintDismissed });

sample({ clock: backgroundHintDismissed, fn: () => true, target: $isHintDismissed });
sample({ clock: backgroundHintDismissed, target: writeHintDismissedFx });
