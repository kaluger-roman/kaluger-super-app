import { createEffect, createEvent, createStore, sample } from "effector";

import * as callModel from "./call.model";
import { readOpenedCallId, takeCallIdFromUrl } from "./callNotificationOpen.helpers";

// The call of the tapped notification, until the server says whether it still rings.
export const $pendingNotificationCallId = createStore<string | null>(null);

export const notificationOpened = createEvent<string>();
export const serviceWorkerMessageReceived = createEvent<unknown>();
// The notification was tapped while the app already ran: the service worker focused this page.
export const notificationOpenedInApp = createEvent<string>();
// The tapped notification is about a call that is already over (FR-017).
export const staleCallNotificationOpened = createEvent();
// The page waits for the server's snapshot to tell whether the call of this notification still rings.
export const notificationAwaited = createEvent<string>();

export const readCallIdFromUrlFx = createEffect(takeCallIdFromUrl);

sample({
  clock: serviceWorkerMessageReceived.map(readOpenedCallId),
  filter: (callId): callId is string => callId !== null,
  target: notificationOpenedInApp,
});
sample({
  clock: [notificationOpenedInApp, readCallIdFromUrlFx.doneData],
  filter: (callId): callId is string => callId !== null,
  target: notificationOpened,
});

// The incoming call of that notification is already on the screen: nothing to wait for. Otherwise
// the server's snapshots settle it (callSync asks and decides, callResume brings the call back).
sample({
  clock: notificationOpened,
  source: callModel.$callId,
  filter: (current, callId) => current !== callId,
  fn: (_, callId) => callId,
  target: notificationAwaited,
});
sample({ clock: notificationAwaited, target: $pendingNotificationCallId });
