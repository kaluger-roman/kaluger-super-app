import { sample } from "effector";

import {
  $completedLessons,
  $cancelledLessons,
  $allLessons,
  $upcomingLessons,
  $weeklyLessons,
  $scheduleLessons,
  $currentLesson,
  $completedPagination,
  $cancelledPagination,
  $allPagination,
  $upcomingPagination,
  $paymentsSummary,
  loadCompletedLessonsFx,
  loadCancelledLessonsFx,
  loadAllLessonsFx,
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
  clock: loadAllLessonsFx.doneData,
  fn: ({ lessons }) => lessons,
  target: $allLessons,
});

sample({
  clock: loadAllLessonsFx.doneData,
  fn: ({ pagination }) => pagination,
  target: $allPagination,
});

sample({
  clock: [
    loadAllLessonsFx.doneData,
    loadUpcomingLessonsFx.doneData,
    loadCompletedLessonsFx.doneData,
    loadCancelledLessonsFx.doneData,
    loadWeeklyLessonsFx.doneData,
  ],
  fn: ({ paymentsSummary }) => paymentsSummary ?? null,
  target: $paymentsSummary,
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
