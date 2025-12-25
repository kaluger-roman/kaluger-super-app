import { createStore, createEvent, sample } from "effector";

export const $deleteAllFuture = createStore(false);

export const deleteAllFutureToggled = createEvent<boolean>();
export const dialogClosed = createEvent();

sample({
  clock: deleteAllFutureToggled,
  target: $deleteAllFuture,
});

sample({
  clock: dialogClosed,
  fn: () => false,
  target: $deleteAllFuture,
});
