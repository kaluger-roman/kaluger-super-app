import { sample } from "effector";

import * as apiModel from "./api.model";
import {
  groupLessonsByDay,
  addLessonToSchedule,
  updateLessonInSchedule,
  removeLessonFromSchedule,
} from "./stores.helpers";

sample({
  clock: apiModel.loadCompletedLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: apiModel.$completedLessons,
});

sample({
  clock: apiModel.loadCompletedLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: apiModel.$completedPagination,
});

sample({
  clock: apiModel.loadCancelledLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: apiModel.$cancelledLessons,
});

sample({
  clock: apiModel.loadCancelledLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: apiModel.$cancelledPagination,
});

sample({
  clock: apiModel.loadAllLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: apiModel.$allLessons,
});

sample({
  clock: apiModel.loadAllLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: apiModel.$allPagination,
});

sample({
  clock: apiModel.loadAllLessonsFx.doneData,
  fn: ({ paymentsSummary }) => paymentsSummary ?? null,
  target: apiModel.$paymentsSummary,
});

sample({
  clock: apiModel.loadUpcomingLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: apiModel.$upcomingLessons,
});

sample({
  clock: apiModel.loadUpcomingLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: apiModel.$upcomingPagination,
});

sample({
  clock: apiModel.addLessonFx.doneData,
  source: apiModel.$upcomingLessons,
  fn: (lessons, newLesson) => [...lessons, newLesson],
  target: apiModel.$upcomingLessons,
});

sample({
  clock: apiModel.updateLessonFx.doneData,
  source: apiModel.$upcomingLessons,
  fn: (lessons, updatedLesson) =>
    lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)),
  target: apiModel.$upcomingLessons,
});

sample({
  clock: apiModel.removeLessonFx.doneData,
  source: apiModel.$upcomingLessons,
  fn: (lessons, removedId) => lessons.filter((lesson) => lesson.id !== removedId),
  target: apiModel.$upcomingLessons,
});

sample({
  clock: apiModel.loadWeeklyLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: apiModel.$weeklyLessons,
});

sample({
  clock: apiModel.loadScheduleLessonsFx.doneData,
  source: apiModel.$scheduleLessons,
  fn: (state, { lessons }) => groupLessonsByDay(state, lessons),
  target: apiModel.$scheduleLessons,
});

sample({
  clock: apiModel.addLessonFx.doneData,
  source: apiModel.$scheduleLessons,
  fn: addLessonToSchedule,
  target: apiModel.$scheduleLessons,
});

sample({
  clock: apiModel.updateLessonFx.doneData,
  source: apiModel.$scheduleLessons,
  fn: updateLessonInSchedule,
  target: apiModel.$scheduleLessons,
});

sample({
  clock: apiModel.removeLessonFx.doneData,
  source: apiModel.$scheduleLessons,
  fn: removeLessonFromSchedule,
  target: apiModel.$scheduleLessons,
});

sample({
  clock: apiModel.loadLessonFx.doneData,
  target: apiModel.$currentLesson,
});

sample({
  clock: apiModel.updateLessonFx.doneData,
  source: apiModel.$currentLesson,
  fn: (current, updated) => (current?.id === updated.id ? updated : current),
  target: apiModel.$currentLesson,
});

sample({
  clock: apiModel.removeLessonFx.doneData,
  fn: () => null,
  target: apiModel.$currentLesson,
});
