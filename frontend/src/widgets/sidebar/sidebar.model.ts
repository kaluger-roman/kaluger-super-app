import { createStore, createEvent, sample } from "effector";

// Events
export const sidebarToggled = createEvent();
export const sidebarClosed = createEvent();

// Store
export const $isSidebarOpen = createStore<boolean>(false);

// Logic
sample({
  clock: sidebarToggled,
  source: $isSidebarOpen,
  fn: (isOpen) => !isOpen,
  target: $isSidebarOpen,
});

sample({
  clock: sidebarClosed,
  fn: () => false,
  target: $isSidebarOpen,
});
