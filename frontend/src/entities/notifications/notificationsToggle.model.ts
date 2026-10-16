import { createStore, sample, combine } from "effector";

import { userModel } from "@entities/user";
import { showNotification } from "@shared";

import { toggleInterval } from "./notifications.helpers";
import * as notificationsModel from "./notifications.model";
import type { ReminderSettings } from "./notifications.types";

// Срабатывает один раз за сессию — иначе при каждом PWA-resume
// `notificationsModel.loadSettingsFx` повторно тригерит `Notification.requestPermission()`.
export const $autoSubscribeAttempted = createStore(false);

sample({
  clock: [
    notificationsModel.loadSettingsFx.doneData,
    notificationsModel.loadVapidKeyFx.doneData,
    notificationsModel.checkPushSubscriptionFx.doneData,
  ],
  source: {
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    vapidKey: notificationsModel.$vapidKey,
    reg: notificationsModel.$serviceWorkerRegistration,
    attempted: $autoSubscribeAttempted,
  },
  filter: ({ settings, subscribed, vapidKey, reg, attempted }) =>
    !attempted && settings.enabled && !subscribed && vapidKey !== null && reg !== null,
  fn: ({ vapidKey, reg }) => ({ vapidKey: vapidKey!, registration: reg! }),
  target: notificationsModel.subscribePushFx,
});

sample({
  clock: [notificationsModel.subscribePushFx.done, notificationsModel.subscribePushFx.fail],
  fn: () => true,
  target: $autoSubscribeAttempted,
});

sample({
  clock: userModel.logoutUser,
  fn: () => false,
  target: $autoSubscribeAttempted,
});

// Interval toggle → compute new intervals and update
sample({
  clock: notificationsModel.intervalToggled,
  source: notificationsModel.$reminderSettings,
  fn: toggleInterval,
  target: notificationsModel.settingsUpdated,
});

// Mute toggle → flip and update
sample({
  clock: notificationsModel.muteToggled,
  source: notificationsModel.$reminderSettings,
  fn: (settings) => ({ muteWhenInLesson: !settings.muteWhenInLesson }),
  target: notificationsModel.settingsUpdated,
});

// Track whether toggle was manual (for toast feedback, not auto-subscribe)
const $isManualToggle = createStore(false);

sample({ clock: notificationsModel.remindersToggled, fn: () => true, target: $isManualToggle });
sample({
  clock: [
    notificationsModel.updateSettingsFx.finally,
    notificationsModel.subscribePushFx.fail,
    notificationsModel.unsubscribePushFx.fail,
  ],
  fn: () => false,
  target: $isManualToggle,
});

// Reminders toggle logic — subscribe/unsubscribe then update settings
const $canSubscribe = combine(
  notificationsModel.$isPushSupported,
  notificationsModel.$vapidKey,
  notificationsModel.$serviceWorkerRegistration,
  (supported, key, reg) => supported && key !== null && reg !== null
);

const $needsSubscribeOnEnable = combine(
  notificationsModel.$isPushSubscribed,
  $canSubscribe,
  (subscribed, canSub) => !subscribed && canSub
);

// Enabling + needs subscribe → subscribe first
sample({
  clock: notificationsModel.remindersToggled,
  source: {
    settings: notificationsModel.$reminderSettings,
    needsSub: $needsSubscribeOnEnable,
    vapidKey: notificationsModel.$vapidKey,
    reg: notificationsModel.$serviceWorkerRegistration,
  },
  filter: ({ settings, needsSub }) => !settings.enabled && needsSub,
  fn: ({ vapidKey, reg }) => ({ vapidKey: vapidKey!, registration: reg! }),
  target: notificationsModel.subscribePushFx,
});

// Subscribe succeeded via manual toggle → enable on server
sample({
  clock: notificationsModel.subscribePushFx.done,
  source: $isManualToggle,
  filter: (isManual) => isManual,
  fn: () => ({ enabled: true }) as Partial<ReminderSettings>,
  target: notificationsModel.settingsUpdated,
});

// Enabling + already subscribed → enable directly
sample({
  clock: notificationsModel.remindersToggled,
  source: {
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    canSub: $canSubscribe,
  },
  filter: ({ settings, subscribed, canSub }) => !settings.enabled && subscribed && canSub,
  fn: () => ({ enabled: true }) as Partial<ReminderSettings>,
  target: notificationsModel.settingsUpdated,
});

// Disabling + subscribed → unsubscribe first
sample({
  clock: notificationsModel.remindersToggled,
  source: {
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    reg: notificationsModel.$serviceWorkerRegistration,
  },
  filter: ({ settings, subscribed, reg }) => settings.enabled && subscribed && reg !== null,
  fn: ({ reg }) => reg!,
  target: notificationsModel.unsubscribePushFx,
});

// Unsubscribe succeeded → disable on server (only when browser actually
// unsubscribed; otherwise sever and client would desync — server thinks
// disabled, browser keeps active subscription).
sample({
  clock: notificationsModel.unsubscribePushFx.done,
  fn: () => ({ enabled: false }) as Partial<ReminderSettings>,
  target: notificationsModel.settingsUpdated,
});

// Unsubscribe failed → notify user; keep server state unchanged so the
// next attempt can complete the disable cleanly.
sample({
  clock: notificationsModel.unsubscribePushFx.fail,
  fn: () => ({
    message: "Не удалось отписаться от уведомлений",
    type: "error" as const,
  }),
  target: showNotification,
});

// Disabling + not subscribed → disable directly
sample({
  clock: notificationsModel.remindersToggled,
  source: {
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
  },
  filter: ({ settings, subscribed }) => settings.enabled && !subscribed,
  fn: () => ({ enabled: false }) as Partial<ReminderSettings>,
  target: notificationsModel.settingsUpdated,
});
