import { createStore, createEvent, sample } from "effector";

// Events
export const tabChanged = createEvent<number>();

// Stores
export const $currentTab = createStore<number>(0);

// Logic
sample({
  clock: tabChanged,
  target: $currentTab,
});
