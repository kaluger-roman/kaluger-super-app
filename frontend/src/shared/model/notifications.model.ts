import { createStore, createEvent, sample } from "effector";

import type { Notification, NotificationType } from "./notifications.types";

export const showNotification = createEvent<{
  message: string;
  type: NotificationType;
}>();

export const hideNotification = createEvent();
export const showSuccessEvent = createEvent<string>();
export const showErrorEvent = createEvent<string>();
export const showWarningEvent = createEvent<string>();
export const showInfoEvent = createEvent<string>();

export const $notification = createStore<Notification>(null);

sample({
  clock: showNotification,
  fn: ({ message, type }) => ({
    message,
    type,
    id: Date.now().toString(),
  }),
  target: $notification,
});

sample({
  clock: showSuccessEvent,
  fn: (message) => ({
    message,
    type: "success" as NotificationType,
    id: Date.now().toString(),
  }),
  target: $notification,
});

sample({
  clock: showErrorEvent,
  fn: (message) => ({
    message,
    type: "error" as NotificationType,
    id: Date.now().toString(),
  }),
  target: $notification,
});

sample({
  clock: showWarningEvent,
  fn: (message) => ({
    message,
    type: "warning" as NotificationType,
    id: Date.now().toString(),
  }),
  target: $notification,
});

sample({
  clock: showInfoEvent,
  fn: (message) => ({
    message,
    type: "info" as NotificationType,
    id: Date.now().toString(),
  }),
  target: $notification,
});

sample({
  clock: hideNotification,
  fn: () => null,
  target: $notification,
});
