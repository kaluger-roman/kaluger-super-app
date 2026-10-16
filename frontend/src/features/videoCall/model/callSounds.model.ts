import { createEffect, sample } from "effector";

import * as callModel from "./call.model";
import type { CallPhase } from "./call.types";
import { getCallSoundsAdapter, syncCallSounds } from "./callSounds.helpers";

const syncCallSoundsFx = createEffect((phase: CallPhase): void => {
  syncCallSounds(getCallSoundsAdapter(), phase);
});

sample({ clock: callModel.$callPhase, target: syncCallSoundsFx });
