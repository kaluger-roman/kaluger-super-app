import { createEffect, sample } from "effector";

import * as callModel from "./call.model";
import type { CallPhase } from "./call.types";
import * as callScreenModel from "./callScreen.model";
import { getCallSoundsAdapter, syncCallSounds } from "./callSounds.helpers";

const syncCallSoundsFx = createEffect((phase: CallPhase): void => {
  syncCallSounds(getCallSoundsAdapter(), phase);
});

const primeCallAudioFx = createEffect((): void => {
  getCallSoundsAdapter().primeAudio();
});

sample({ clock: callScreenModel.$shownCallPhase, target: syncCallSoundsFx });
// The ringback starts later, outside the click, so the audio is unlocked in the click itself.
sample({ clock: callModel.callStarted, fn: () => undefined, target: primeCallAudioFx });
