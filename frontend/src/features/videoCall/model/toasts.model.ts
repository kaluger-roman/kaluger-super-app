import { sample } from "effector";

import { notificationsModel } from "@shared";

import {
  BUSY_TEXT,
  MEDIA_DENIED_TEXT,
  NO_ANSWER_TEXT,
  REJECTED_TEXT,
  TRANSPORT_LOST_TEXT,
} from "./call.constants";
import { isPeerHangup, toCanceledText, toPeerEndedText, toUnavailableText } from "./call.helpers";
import * as callModel from "./call.model";

sample({
  clock: callModel.unavailableReceived,
  fn: toUnavailableText,
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
  fn: toCanceledText,
  target: notificationsModel.showInfoEvent,
});

sample({
  clock: callModel.mediaAcquisitionFailed,
  fn: () => MEDIA_DENIED_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: callModel.callConnectionLost,
  fn: () => TRANSPORT_LOST_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: [callModel.callErrorReceived, callModel.callFailed],
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: callModel.callEnded,
  filter: isPeerHangup,
  fn: toPeerEndedText,
  target: notificationsModel.showInfoEvent,
});

sample({
  clock: callModel.callEnded,
  filter: (reason) => !isPeerHangup(reason),
  fn: toPeerEndedText,
  target: notificationsModel.showErrorEvent,
});
