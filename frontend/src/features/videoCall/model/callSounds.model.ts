import { createEffect, sample } from "effector";

import type { CallPhase } from "./call.types";
import * as callScreenModel from "./callScreen.model";
import { getCallSoundsAdapter, syncCallSounds } from "./callSounds.helpers";

const syncCallSoundsFx = createEffect((phase: CallPhase): void => {
  syncCallSounds(getCallSoundsAdapter(), phase);
});

sample({ clock: callScreenModel.$shownCallPhase, target: syncCallSoundsFx });
