import { createStore, createEvent, sample } from "effector";

export const setOnlyUnpaid = createEvent<boolean>();
export const setOnlyWithoutHomework = createEvent<boolean>();

export const $onlyUnpaid = createStore<boolean>(false);
export const $onlyWithoutHomework = createStore<boolean>(false);

sample({
  clock: setOnlyUnpaid,
  target: $onlyUnpaid,
});

sample({
  clock: setOnlyWithoutHomework,
  target: $onlyWithoutHomework,
});
