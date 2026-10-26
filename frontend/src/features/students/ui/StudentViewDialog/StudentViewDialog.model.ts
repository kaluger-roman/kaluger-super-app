import { createStore, createEvent, sample } from "effector";

import type { Student } from "@shared";

import { isStudentCardCall, toStudentCall } from "./StudentViewDialog.helpers";
import { callConfirmModel } from "../../../videoCall";
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
  fn: toStudentCall,
  target: callConfirmModel.callRequested,
});

sample({
  clock: callConfirmModel.confirmed,
  filter: isStudentCardCall,
  fn: () => undefined,
  target: studentsModel.viewDialogClosed,
});
