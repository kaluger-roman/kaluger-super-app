import { createEvent, sample } from "effector";

import * as callModel from "./call.model";
import type { StartCallParams } from "./call.types";

// A call button was pressed; it starts a call only while there is none, so a second press while
// the dialing screen is still hidden does not send a second invite.
export const callRequested = createEvent<StartCallParams>();

sample({
  clock: callRequested,
  source: callModel.$callPhase,
  filter: (phase) => phase === "idle",
  fn: (_, params) => params,
  target: callModel.callStarted,
});
