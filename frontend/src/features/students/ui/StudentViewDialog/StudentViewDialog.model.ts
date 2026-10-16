import { createStore, createEvent, sample } from "effector";

import type { Student } from "@shared";

import { callModel } from "../../../videoCall";
import { studentsModel } from "../../models";

export const $deleteDialogOpen = createStore(false);

export const deleteDialogOpened = createEvent();
export const deleteDialogClosed = createEvent();
export const callRequested = createEvent<Student>();

sample({
  clock: deleteDialogOpened,
  fn: () => true,
  target: $deleteDialogOpen,
});

sample({
  clock: deleteDialogClosed,
  fn: () => false,
  target: $deleteDialogOpen,
});

sample({
  clock: callRequested,
  fn: (student) => ({ studentId: student.id, peerName: student.name }),
  target: callModel.callStarted,
});

sample({
  clock: callRequested,
  target: studentsModel.viewDialogClosed,
});
