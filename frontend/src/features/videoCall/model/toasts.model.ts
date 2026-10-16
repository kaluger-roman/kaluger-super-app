import { sample } from "effector";

import { notificationsModel } from "@shared";

import {
  BUSY_TEXT,
  CANCELED_TEXT,
  MEDIA_DENIED_TEXT,
  NO_ANSWER_TEXT,
  REJECTED_TEXT,
  UNAVAILABLE_TEXT,
} from "./call.constants";
import * as callModel from "./call.model";

sample({
  clock: callModel.unavailableReceived,
  fn: () => UNAVAILABLE_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: callModel.busyReceived,
  fn: () => BUSY_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: callModel.noAnswerReceived,
  fn: () => NO_ANSWER_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: callModel.rejectedReceived,
  fn: () => REJECTED_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: callModel.canceledReceived,
  fn: () => CANCELED_TEXT,
  target: notificationsModel.showInfoEvent,
});

sample({
  clock: callModel.mediaAcquisitionFailed,
  fn: () => MEDIA_DENIED_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: [callModel.callErrorReceived, callModel.callFailed],
  target: notificationsModel.showErrorEvent,
});
