import { createStore, createEvent } from "effector";

export const setOnlyUnpaid = createEvent<boolean>();
export const setOnlyWithoutHomework = createEvent<boolean>();

export const $onlyUnpaid = createStore<boolean>(false).on(
  setOnlyUnpaid,
  (_, v) => v
);

export const $onlyWithoutHomework = createStore<boolean>(false).on(
  setOnlyWithoutHomework,
  (_, v) => v
);
