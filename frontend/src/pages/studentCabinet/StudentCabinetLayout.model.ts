import { createEvent, sample } from "effector";

import { studentUserModel } from "@entities";
import { callModel } from "@features";

import { toTutorCallParams } from "./StudentCabinetLayout.helpers";

export const tutorCallRequested = createEvent();

sample({
  clock: tutorCallRequested,
  source: studentUserModel.$studentSession,
  fn: toTutorCallParams,
  target: callModel.callStarted,
});
