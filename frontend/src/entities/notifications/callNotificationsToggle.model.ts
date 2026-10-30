import { attach, combine, sample } from "effector";

import * as notificationsModel from "./notifications.model";
import type { ReminderSettings, SubscribePushParams } from "./notifications.types";

// FR-021: the switch shows whether calls reach this device ($isCallNotificationsOn). The device stays
// subscribed while reminders or calls are on; turning calls on for an unsubscribed device asks the
// system on that click. After a refusal the browser does not ask again: the switch is locked and
// the settings explain how to allow notifications (as the student's switch, US4-AS3).
const $subscribeParams = combine(
  notificationsModel.$vapidKey,
  notificationsModel.$serviceWorkerRegistration,
  (vapidKey, registration): SubscribePushParams | null =>
    vapidKey !== null && registration !== null ? { vapidKey, registration } : null
);

const subscribeForCallsFx = attach({ effect: notificationsModel.subscribePushFx });

const callsToggle = sample({
  clock: notificationsModel.callNotificationsToggled,
  source: {
    isOn: notificationsModel.$isCallNotificationsOn,
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    canSubscribe: notificationsModel.$canSubscribePush,
    registration: notificationsModel.$serviceWorkerRegistration,
    denied: notificationsModel.$isPushPermissionDenied,
  },
  filter: ({ denied }) => !denied,
});

const turningOn = sample({ clock: callsToggle, filter: ({ isOn }) => !isOn });
const turningOff = sample({ clock: callsToggle, filter: ({ isOn }) => isOn });

const subscribingDevice = sample({
  clock: turningOn,
  filter: ({ subscribed, canSubscribe }) => canSubscribe && !subscribed,
});

sample({
  clock: subscribingDevice,
  source: $subscribeParams,
  filter: (params): params is SubscribePushParams => params !== null,
  target: subscribeForCallsFx,
});

sample({
  clock: subscribeForCallsFx.done,
  source: notificationsModel.$callNotificationsEnabled,
  filter: (enabled) => !enabled,
  fn: (): Partial<ReminderSettings> => ({ callNotificationsEnabled: true }),
  target: notificationsModel.settingsUpdated,
});

sample({
  clock: turningOn,
  filter: ({ subscribed, canSubscribe }) => subscribed || !canSubscribe,
  fn: (): Partial<ReminderSettings> => ({ callNotificationsEnabled: true }),
  target: notificationsModel.settingsUpdated,
});

// Turning off the last of the two unsubscribes the device; the server is updated once the browser
// let go of the subscription (notificationsToggle.model).
const disablingLast = sample({
  clock: turningOff,
  filter: ({ settings, subscribed, registration }) =>
    !settings.enabled && subscribed && registration !== null,
});

sample({
  clock: disablingLast,
  source: notificationsModel.$serviceWorkerRegistration,
  filter: (registration): registration is ServiceWorkerRegistration => registration !== null,
  target: notificationsModel.unsubscribePushFx,
});

sample({
  clock: turningOff,
  filter: ({ settings, subscribed, registration }) =>
    settings.enabled || !subscribed || registration === null,
  fn: (): Partial<ReminderSettings> => ({ callNotificationsEnabled: false }),
  target: notificationsModel.settingsUpdated,
});
