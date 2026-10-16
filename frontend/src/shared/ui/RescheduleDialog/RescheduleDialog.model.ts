import { createStore, createEvent, sample } from "effector";

import type { Lesson } from "../../types";

// Events
export const rescheduleDialogOpened = createEvent<Lesson>();
export const rescheduleDialogClosed = createEvent();
export const newStartTimeChanged = createEvent<Date>();
export const newEndTimeChanged = createEvent<Date>();
export const rescheduleConfirmed = createEvent();

// Stores
export const $isOpen = createStore<boolean>(false);
export const $lesson = createStore<Lesson | undefined>(undefined, { skipVoid: false });
export const $newStartTime = createStore<Date | undefined>(undefined, { skipVoid: false });
export const $newEndTime = createStore<Date | undefined>(undefined, { skipVoid: false });

// Logic
sample({
  clock: rescheduleDialogOpened,
  fn: () => true,
  target: $isOpen,
});

sample({
  clock: rescheduleDialogOpened,
  target: $lesson,
});

sample({
  clock: rescheduleDialogOpened,
  fn: (lesson) => (lesson ? new Date(lesson.startTime) : undefined),
  target: $newStartTime,
});

sample({
  clock: rescheduleDialogOpened,
  fn: (lesson) => (lesson ? new Date(lesson.endTime) : undefined),
  target: $newEndTime,
});

sample({
  clock: rescheduleDialogClosed,
  fn: () => false,
  target: $isOpen,
});

sample({
  clock: rescheduleDialogClosed,
  fn: () => undefined,
  target: [$lesson, $newStartTime, $newEndTime],
});

sample({
  clock: newStartTimeChanged,
  target: $newStartTime,
});

sample({
  clock: newStartTimeChanged,
  source: { lesson: $lesson, newStartTime: $newStartTime },
  filter: ({ lesson }) => Boolean(lesson),
  fn: ({ lesson, newStartTime }) => {
    if (!lesson || !newStartTime) return undefined;
    const originalDuration =
      new Date(lesson.endTime).getTime() - new Date(lesson.startTime).getTime();
    return new Date(newStartTime.getTime() + originalDuration);
  },
  target: $newEndTime,
});

sample({
  clock: newEndTimeChanged,
  target: $newEndTime,
});
