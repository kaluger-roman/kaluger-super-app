import { createEvent, sample } from "effector";

import { studentUserModel } from "@entities";
import { callRequestModel } from "@features";
import type { StartCallParams } from "@features";

export const tutorCallRequested = createEvent();

// The call button is shown only for a student with a linked tutor.
const tutorToCall = sample({
  clock: tutorCallRequested,
  source: studentUserModel.$studentSession,
  fn: (session) => session?.tutor ?? null,
});

sample({
  clock: tutorToCall,
  filter: Boolean,
  fn: (tutor): StartCallParams => ({ peerName: tutor.name }),
  target: callRequestModel.callRequested,
});
