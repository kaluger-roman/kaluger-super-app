import { createEvent, sample } from "effector";

import * as callModel from "./call.model";
import type { ResumeRequest, StartCallParams } from "./call.types";

// The one way into a call for screens and other features (FR-031): a native shell can later take
// these four events over without touching the screens.
export const startRequested = createEvent<StartCallParams>();
export const answerRequested = createEvent();
export const rejectRequested = createEvent();
export const resumeRequested = createEvent<ResumeRequest>();

// A call button starts a call only while there is none, so a second press while the dialing
// screen is still hidden does not send a second invite.
sample({
  clock: startRequested,
  source: callModel.$callPhase,
  filter: (phase) => phase === "idle",
  fn: (_, params) => params,
  target: callModel.callStarted,
});

// A double tap, or a tap that lands after the call was canceled, answers nothing.
sample({
  clock: answerRequested,
  source: callModel.$callPhase,
  filter: (phase) => phase === "incoming",
  fn: () => undefined,
  target: callModel.acceptCall,
});
sample({
  clock: rejectRequested,
  source: callModel.$callPhase,
  filter: (phase) => phase === "incoming",
  fn: () => undefined,
  target: callModel.rejectCall,
});
