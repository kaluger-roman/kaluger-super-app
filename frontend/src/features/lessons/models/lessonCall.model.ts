import { createEvent, sample } from "effector";

import { isCallOfLesson, isStartCall, toLessonCall } from "./lessonCall.helpers";
import * as lessonsViewDialogModel from "./lessonsViewDialog.model";
import { callConfirmModel } from "../../videoCall";

export const lessonCallRequested = createEvent();

const lessonCall = sample({
  clock: lessonCallRequested,
  source: lessonsViewDialogModel.$viewingLesson,
  fn: toLessonCall,
});

sample({ clock: lessonCall, filter: isStartCall, target: callConfirmModel.callRequested });

sample({
  clock: callConfirmModel.confirmed,
  source: lessonsViewDialogModel.$viewingLesson,
  filter: isCallOfLesson,
  fn: () => undefined,
  target: lessonsViewDialogModel.viewDialogClosed,
});
