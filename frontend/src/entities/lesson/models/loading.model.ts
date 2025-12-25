import { sample } from "effector";

import {
  $isLoading,
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

sample({
  clock: [
    loadCompletedLessonsFx,
    loadCancelledLessonsFx,
    loadLessonFx,
    loadUpcomingLessonsFx,
    loadWeeklyLessonsFx,
    loadScheduleLessonsFx,
    addLessonFx,
    updateLessonFx,
    removeLessonFx,
  ],
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: [
    loadCompletedLessonsFx.done,
    loadCancelledLessonsFx.done,
    loadLessonFx.done,
    loadUpcomingLessonsFx.done,
    loadWeeklyLessonsFx.done,
    loadScheduleLessonsFx.done,
    addLessonFx.done,
    updateLessonFx.done,
    removeLessonFx.done,
    loadCompletedLessonsFx.fail,
    loadCancelledLessonsFx.fail,
    loadLessonFx.fail,
    loadUpcomingLessonsFx.fail,
    loadWeeklyLessonsFx.fail,
    loadScheduleLessonsFx.fail,
    addLessonFx.fail,
    updateLessonFx.fail,
    removeLessonFx.fail,
  ],
  fn: () => false,
  target: $isLoading,
});
