import { sample } from "effector";

import { showNotification } from "@shared";

import {
  BUSY_MESSAGE,
  MEDIA_DENIED_MESSAGE,
  NO_ANSWER_MESSAGE,
  REJECTED_MESSAGE,
  UNAVAILABLE_MESSAGE,
} from "./call.helpers";
import {
  busyReceived,
  callErrorReceived,
  callFailed,
  mediaAcquisitionFailed,
  noAnswerReceived,
  rejectedReceived,
  unavailableReceived,
} from "./call.model";

const toErrorToast = (text: string) => ({ message: text, type: "error" as const });

sample({
  clock: unavailableReceived,
  fn: () => toErrorToast(UNAVAILABLE_MESSAGE?.text ?? ""),
  target: showNotification,
});

sample({
  clock: busyReceived,
  fn: () => toErrorToast(BUSY_MESSAGE?.text ?? ""),
  target: showNotification,
});

sample({
  clock: noAnswerReceived,
  fn: () => toErrorToast(NO_ANSWER_MESSAGE?.text ?? ""),
  target: showNotification,
});

sample({
  clock: rejectedReceived,
  fn: () => toErrorToast(REJECTED_MESSAGE?.text ?? ""),
  target: showNotification,
});

sample({
  clock: mediaAcquisitionFailed,
  fn: () => toErrorToast(MEDIA_DENIED_MESSAGE?.text ?? ""),
  target: showNotification,
});

sample({
  clock: callErrorReceived,
  fn: (text) => toErrorToast(text),
  target: showNotification,
});

sample({
  clock: callFailed,
  fn: (text) => toErrorToast(text),
  target: showNotification,
});
