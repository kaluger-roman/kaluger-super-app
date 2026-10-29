import { createStore, sample, combine } from "effector";

import { userModel } from "@entities/user";
import { showNotification } from "@shared";

import { DEFAULT_REMINDER_SETTINGS } from "./notifications.constants";
import {
  shouldAutoSubscribe,
  shouldSyncSubscription,
  toggleInterval,
} from "./notifications.helpers";
import * as notificationsModel from "./notifications.model";
import type { ReminderSettings, SubscribePushParams } from "./notifications.types";

// Срабатывает один раз за сессию — иначе при каждом PWA-resume
// `notificationsModel.loadSettingsFx` повторно тригерит `Notification.requestPermission()`.
export const $autoSubscribeAttempted = createStore(false);
// The defaults in $reminderSettings are not this tutor's choice: nothing is subscribed by them.
const $areSettingsLoaded = createStore(false);
const $isSubscriptionSynced = createStore(false);

const tutorSessionEnded = [userModel.logoutUser, userModel.tutorSessionCleared];

sample({
  clock: notificationsModel.loadSettingsFx.done,
  fn: () => true,
  target: $areSettingsLoaded,
});

sample({
  clock: [
    notificationsModel.loadSettingsFx.doneData,
    notificationsModel.loadVapidKeyFx.doneData,
    notificationsModel.checkPushSubscriptionFx.doneData,
  ],
  source: {
    attempted: $autoSubscribeAttempted,
    isTutorSession: userModel.$isAuthenticated,
    settingsLoaded: $areSettingsLoaded,
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    permission: notificationsModel.$pushPermission,
    vapidKey: notificationsModel.$vapidKey,
    reg: notificationsModel.$serviceWorkerRegistration,
  },
  filter: shouldAutoSubscribe,
  fn: ({ vapidKey, reg }): SubscribePushParams => ({ vapidKey, registration: reg }),
  target: notificationsModel.subscribePushFx,
});

sample({
  clock: [notificationsModel.subscribePushFx.done, notificationsModel.subscribePushFx.fail],
  fn: () => true,
  target: $autoSubscribeAttempted,
});

sample({
  clock: [
    notificationsModel.loadSettingsFx.doneData,
    notificationsModel.checkPushSubscriptionFx.doneData,
  ],
  source: {
    synced: $isSubscriptionSynced,
    isTutorSession: userModel.$isAuthenticated,
    settingsLoaded: $areSettingsLoaded,
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    permission: notificationsModel.$pushPermission,
    reg: notificationsModel.$serviceWorkerRegistration,
  },
  filter: shouldSyncSubscription,
  fn: ({ reg }) => reg,
  target: notificationsModel.syncSubscriptionFx,
});

// A subscribe sends the browser's subscription as well.
sample({
  clock: [notificationsModel.syncSubscriptionFx, notificationsModel.subscribePushFx.done],
  fn: () => true,
  target: $isSubscriptionSynced,
});
sample({
  clock: notificationsModel.syncSubscriptionFx.doneData,
  target: notificationsModel.$isPushSubscribed,
});
// Not bound to this tutor for sure: the switch offers to subscribe again.
sample({
  clock: notificationsModel.syncSubscriptionFx.fail,
  fn: () => false,
  target: notificationsModel.$isPushSubscribed,
});

// The next account signed in on this tab (a tutor or a student) must not inherit this tutor's
// settings: they would subscribe the device through the tutor API without a tutor token.
sample({
  clock: tutorSessionEnded,
  fn: () => false,
  target: [
    $autoSubscribeAttempted,
    $areSettingsLoaded,
    $isSubscriptionSynced,
    notificationsModel.$isPushSubscribed,
  ],
});

sample({
  clock: tutorSessionEnded,
  fn: () => DEFAULT_REMINDER_SETTINGS,
  target: notificationsModel.$reminderSettings,
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
const $needsSubscribeOnEnable = combine(
  notificationsModel.$isPushSubscribed,
  notificationsModel.$canSubscribePush,
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
    canSub: notificationsModel.$canSubscribePush,
  },
  filter: ({ settings, subscribed, canSub }) => !settings.enabled && subscribed && canSub,
  fn: () => ({ enabled: true }) as Partial<ReminderSettings>,
  target: notificationsModel.settingsUpdated,
});

// Disabling the last of reminders and calls + subscribed → unsubscribe first (FR-021)
sample({
  clock: notificationsModel.remindersToggled,
  source: {
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
    reg: notificationsModel.$serviceWorkerRegistration,
  },
  filter: ({ settings, subscribed, reg }) =>
    settings.enabled && !settings.callNotificationsEnabled && subscribed && reg !== null,
  fn: ({ reg }) => reg!,
  target: notificationsModel.unsubscribePushFx,
});

// Unsubscribe succeeded → disable on server (only when browser actually
// unsubscribed; otherwise sever and client would desync — server thinks
// disabled, browser keeps active subscription). The device is unsubscribed
// only when both reminders and calls end up off.
sample({
  clock: notificationsModel.unsubscribePushFx.done,
  fn: (): Partial<ReminderSettings> => ({ enabled: false, callNotificationsEnabled: false }),
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

// Disabling + not subscribed, or calls still keep the device → disable directly
sample({
  clock: notificationsModel.remindersToggled,
  source: {
    settings: notificationsModel.$reminderSettings,
    subscribed: notificationsModel.$isPushSubscribed,
  },
  filter: ({ settings, subscribed }) =>
    settings.enabled && (!subscribed || settings.callNotificationsEnabled),
  fn: () => ({ enabled: false }) as Partial<ReminderSettings>,
  target: notificationsModel.settingsUpdated,
});
