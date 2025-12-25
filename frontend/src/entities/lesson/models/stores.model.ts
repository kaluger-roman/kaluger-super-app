import { sample } from "effector";

import {
  $completedLessons,
  $cancelledLessons,
  $upcomingLessons,
  $weeklyLessons,
  $scheduleLessons,
  $currentLesson,
  $completedPagination,
  $cancelledPagination,
  $upcomingPagination,
  loadCompletedLessonsFx,
  loadCancelledLessonsFx,
  loadLessonFx,
  loadUpcomingLessonsFx,
  loadWeeklyLessonsFx,
  loadScheduleLessonsFx,
  addLessonFx,
  updateLessonFx,
  removeLessonFx,
} from "./api.model";
import {
  groupLessonsByDay,
  addLessonToSchedule,
  updateLessonInSchedule,
  removeLessonFromSchedule,
} from "./stores.helpers";

sample({
  clock: loadCompletedLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: $completedLessons,
});

sample({
  clock: loadCompletedLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: $completedPagination,
});

sample({
  clock: loadCancelledLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: $cancelledLessons,
});

sample({
  clock: loadCancelledLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: $cancelledPagination,
});

sample({
  clock: loadUpcomingLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: $upcomingLessons,
});

sample({
  clock: loadUpcomingLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: $upcomingPagination,
});

sample({
  clock: addLessonFx.doneData,
  source: $upcomingLessons,
  fn: (lessons, newLesson) => [...lessons, newLesson],
  target: $upcomingLessons,
});

sample({
  clock: updateLessonFx.doneData,
  source: $upcomingLessons,
  fn: (lessons, updatedLesson) =>
    lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)),
  target: $upcomingLessons,
});

sample({
  clock: removeLessonFx.doneData,
  source: $upcomingLessons,
  fn: (lessons, removedId) => lessons.filter((lesson) => lesson.id !== removedId),
  target: $upcomingLessons,
});

sample({
  clock: loadWeeklyLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: $weeklyLessons,
});

sample({
  clock: loadScheduleLessonsFx.doneData,
  source: $scheduleLessons,
  fn: (state, { lessons }) => groupLessonsByDay(state, lessons),
  target: $scheduleLessons,
});

sample({
  clock: addLessonFx.doneData,
  source: $scheduleLessons,
  fn: addLessonToSchedule,
  target: $scheduleLessons,
});

sample({
  clock: updateLessonFx.doneData,
  source: $scheduleLessons,
  fn: updateLessonInSchedule,
  target: $scheduleLessons,
});

sample({
  clock: removeLessonFx.doneData,
  source: $scheduleLessons,
  fn: removeLessonFromSchedule,
  target: $scheduleLessons,
});

sample({
  clock: loadLessonFx.doneData,
  target: $currentLesson,
});

sample({
  clock: updateLessonFx.doneData,
  source: $currentLesson,
  fn: (current, updated) => (current?.id === updated.id ? updated : current),
  target: $currentLesson,
});

sample({
  clock: removeLessonFx.doneData,
  fn: () => null,
  target: $currentLesson,
});
