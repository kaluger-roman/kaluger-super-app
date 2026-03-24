import { createStore, sample, combine } from "effector";

import { notificationsModel as toastModel } from "@shared";

import { toggleInterval } from "./notifications.helpers";
import {
  $reminderSettings,
  $isPushSubscribed,
  $isPushSupported,
  $vapidKey,
  $serviceWorkerRegistration,
  remindersToggled,
  intervalToggled,
  muteToggled,
  settingsUpdated,
  subscribePushFx,
  unsubscribePushFx,
  updateSettingsFx,
  loadSettingsFx,
  loadVapidKeyFx,
  checkPushSubscriptionFx,
} from "./notifications.model";
import type { ReminderSettings } from "./notifications.types";

// Auto-subscribe device on initial load when server has enabled=true but no local push subscription
sample({
  clock: [loadSettingsFx.doneData, loadVapidKeyFx.doneData, checkPushSubscriptionFx.doneData],
  source: { settings: $reminderSettings, subscribed: $isPushSubscribed, vapidKey: $vapidKey, reg: $serviceWorkerRegistration },
  filter: ({ settings, subscribed, vapidKey, reg }) =>
    settings.enabled && !subscribed && vapidKey !== null && reg !== null,
  fn: ({ vapidKey, reg }) => ({ vapidKey: vapidKey!, registration: reg! }),
  target: subscribePushFx,
});

// Interval toggle → compute new intervals and update
sample({
  clock: intervalToggled,
  source: $reminderSettings,
  fn: toggleInterval,
  target: settingsUpdated,
});

// Mute toggle → flip and update
sample({
  clock: muteToggled,
  source: $reminderSettings,
  fn: (settings) => ({ muteWhenInLesson: !settings.muteWhenInLesson }),
  target: settingsUpdated,
});

// Track whether subscribe was triggered by manual toggle (vs auto-subscribe)
const $isManualToggle = createStore(false);

sample({ clock: remindersToggled, fn: () => true, target: $isManualToggle });
sample({ clock: [updateSettingsFx.finally, subscribePushFx.fail], fn: () => false, target: $isManualToggle });

// Reminders toggle logic — subscribe/unsubscribe then update settings
const $canSubscribe = combine(
  $isPushSupported, $vapidKey, $serviceWorkerRegistration,
  (supported, key, reg) => supported && key !== null && reg !== null
);

const $needsSubscribeOnEnable = combine(
  $isPushSubscribed, $canSubscribe,
  (subscribed, canSub) => !subscribed && canSub
);

// Enabling + needs subscribe → subscribe first
sample({
  clock: remindersToggled,
  source: { settings: $reminderSettings, needsSub: $needsSubscribeOnEnable, vapidKey: $vapidKey, reg: $serviceWorkerRegistration },
  filter: ({ settings, needsSub }) => !settings.enabled && needsSub,
  fn: ({ vapidKey, reg }) => ({ vapidKey: vapidKey!, registration: reg! }),
  target: subscribePushFx,
});

// Subscribe succeeded via manual toggle → enable on server
sample({
  clock: subscribePushFx.done,
  source: $isManualToggle,
  filter: (isManual) => isManual,
  fn: () => ({ enabled: true } as Partial<ReminderSettings>),
  target: settingsUpdated,
});

// Enabling + already subscribed → enable directly
sample({
  clock: remindersToggled,
  source: { settings: $reminderSettings, subscribed: $isPushSubscribed, canSub: $canSubscribe },
  filter: ({ settings, subscribed, canSub }) => !settings.enabled && subscribed && canSub,
  fn: () => ({ enabled: true } as Partial<ReminderSettings>),
  target: settingsUpdated,
});

// Disabling + subscribed → unsubscribe first
sample({
  clock: remindersToggled,
  source: { settings: $reminderSettings, subscribed: $isPushSubscribed, reg: $serviceWorkerRegistration },
  filter: ({ settings, subscribed, reg }) => settings.enabled && subscribed && reg !== null,
  fn: ({ reg }) => reg!,
  target: unsubscribePushFx,
});

// Unsubscribe finished (success or fail) → disable
sample({
  clock: unsubscribePushFx.finally,
  fn: () => ({ enabled: false } as Partial<ReminderSettings>),
  target: settingsUpdated,
});

// Disabling + not subscribed → disable directly
sample({
  clock: remindersToggled,
  source: { settings: $reminderSettings, subscribed: $isPushSubscribed },
  filter: ({ settings, subscribed }) => settings.enabled && !subscribed,
  fn: () => ({ enabled: false } as Partial<ReminderSettings>),
  target: settingsUpdated,
});

// Toggle feedback — success notification after settings update completes
sample({
  clock: updateSettingsFx.doneData,
  source: $isManualToggle,
  filter: (isManual) => isManual,
  fn: (_, settings) => settings.enabled ? "Напоминания включены" : "Напоминания отключены",
  target: toastModel.showSuccessEvent,
});

// Toggle feedback — error on subscribe failure
sample({
  clock: subscribePushFx.fail,
  source: $isManualToggle,
  filter: (isManual) => isManual,
  fn: () => "Не удалось подписаться на уведомления",
  target: toastModel.showErrorEvent,
});
