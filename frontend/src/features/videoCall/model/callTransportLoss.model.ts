import { combine, createStore, sample } from "effector";
import { delay } from "patronum";

import * as callModel from "./call.model";
import { isEndedCallRefusal, isOwnCall, toGraceStart } from "./callResume.helpers";
import * as callResumeModel from "./callResume.model";

// patronum `delay` cannot be cancelled: a delayed check counts only for the current generation.
const $graceGeneration = createStore(0);
const $localCall = combine({
  callId: callModel.$callId,
  phase: callModel.$callPhase,
  role: callModel.$callRole,
});

const graceStarted = sample({
  clock: callResumeModel.$isOwnTransportLost.updates,
  source: { generation: $graceGeneration, phase: callModel.$callPhase },
  filter: (_, lost) => lost,
  fn: toGraceStart,
});
sample({ clock: graceStarted, fn: ({ generation }) => generation, target: $graceGeneration });
sample({
  clock: callModel.callTerminated,
  source: $graceGeneration,
  fn: (generation) => generation + 1,
  target: $graceGeneration,
});
const graceExpired = sample({
  clock: delay({ source: graceStarted, timeout: ({ timeoutMs }) => timeoutMs }),
  source: { lost: callResumeModel.$isOwnTransportLost, generation: $graceGeneration },
  filter: ({ lost, generation }, started) => lost && generation === started.generation,
  fn: () => undefined,
});
sample({
  clock: graceExpired,
  target: [callModel.callEndedLocally, callResumeModel.returnedToEndedCall],
});

// Another window took the call over: this one lets it go silently.
sample({
  clock: callResumeModel.transportWaiting,
  source: $localCall,
  filter: isOwnCall,
  fn: () => undefined,
  target: callModel.callEndedLocally,
});

// Read once: ending the call resets the phase the notice depends on.
const ownCallTakenElsewhere = sample({
  clock: callResumeModel.transportTakenElsewhere,
  source: $localCall,
  filter: (local, { role }) => isOwnCall(local, role),
  fn: ({ phase }, taken) => isEndedCallRefusal(phase, taken),
});
sample({ clock: ownCallTakenElsewhere, fn: () => undefined, target: callModel.callEndedLocally });
sample({
  clock: ownCallTakenElsewhere,
  filter: Boolean,
  fn: () => undefined,
  target: callResumeModel.returnedToEndedCall,
});
