import { createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";

export const ScheduleViewGate = createGate();

export const $compactMode = createStore(false);
export const $containerWidth = createStore(0);
export const $centerDate = createStore(new Date());

export const compactModeToggled = createEvent<boolean>();
export const containerWidthSet = createEvent<number>();
export const centerDateSet = createEvent<Date>();

sample({
  clock: compactModeToggled,
  target: $compactMode,
});

sample({
  clock: containerWidthSet,
  target: $containerWidth,
});

sample({
  clock: centerDateSet,
  target: $centerDate,
});

sample({
  clock: ScheduleViewGate.open,
  fn: () => new Date(),
  target: $centerDate,
});
