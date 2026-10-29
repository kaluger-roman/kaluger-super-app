import { combine, createEvent, createStore, sample } from "effector";

import { studentUserModel } from "@entities";

import {
  findOpenedLesson,
  isCallOfOpenedLesson,
  isStartCall,
  toStudentLessonCall,
} from "./studentLessonDialog.helpers";
import * as studentScheduleModel from "./studentSchedule.model";
import { callConfirmModel } from "../../videoCall";

export const $openedLessonId = createStore<string | null>(null);
export const $openedLesson = combine(
  studentScheduleModel.$lessons,
  $openedLessonId,
  findOpenedLesson
);
export const $tutorName = studentUserModel.$studentSession.map(
  (session) => session?.tutor?.name ?? null
);

export const lessonOpened = createEvent<string>();
export const dialogClosed = createEvent();
export const callRequested = createEvent();

sample({ clock: lessonOpened, target: $openedLessonId });

const studentCall = sample({
  clock: callRequested,
  source: { lesson: $openedLesson, tutorName: $tutorName },
  fn: toStudentLessonCall,
});
sample({ clock: studentCall, filter: isStartCall, target: callConfirmModel.callRequested });

const confirmedForOpened = sample({
  clock: callConfirmModel.confirmed,
  source: $openedLessonId,
  filter: isCallOfOpenedLesson,
});
// A lesson that left the shown week or was deleted over the WS closes the dialog for good, so it
// does not pop up again when the lesson comes back.
const openedLessonGone = sample({
  clock: $openedLesson.updates,
  source: $openedLessonId,
  filter: (openedId, lesson) => openedId !== null && lesson === null,
});

sample({
  clock: [
    dialogClosed,
    openedLessonGone,
    confirmedForOpened,
    studentScheduleModel.$weekStart,
    studentScheduleModel.StudentSchedulePageGate.close,
  ],
  fn: () => null,
  target: $openedLessonId,
});
