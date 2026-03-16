import { sample, combine } from "effector";

import { toggleInterval } from "./notifications.helpers";
import {
  $reminderSettings,
  $isPushSubscribed,
  $vapidKey,
  $serviceWorkerRegistration,
  remindersToggled,
  intervalToggled,
  muteToggled,
  settingsUpdated,
  subscribePushFx,
  unsubscribePushFx,
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

// Reminders toggle logic — subscribe/unsubscribe then update settings
const $needsSubscribeOnEnable = combine(
  $isPushSubscribed, $vapidKey, $serviceWorkerRegistration,
  (subscribed, key, reg) => !subscribed && key !== null && reg !== null
);

// Enabling + needs subscribe → subscribe first
sample({
  clock: remindersToggled,
  source: { settings: $reminderSettings, needsSub: $needsSubscribeOnEnable, vapidKey: $vapidKey, reg: $serviceWorkerRegistration },
  filter: ({ settings, needsSub }) => !settings.enabled && needsSub,
  fn: ({ vapidKey, reg }) => ({ vapidKey: vapidKey!, registration: reg! }),
  target: subscribePushFx,
});

// Subscribe succeeded → enable
sample({
  clock: subscribePushFx.done,
  fn: () => ({ enabled: true } as Partial<ReminderSettings>),
  target: settingsUpdated,
});

// Enabling + already subscribed (or can't subscribe) → enable directly
sample({
  clock: remindersToggled,
  source: { settings: $reminderSettings, needsSub: $needsSubscribeOnEnable },
  filter: ({ settings, needsSub }) => !settings.enabled && !needsSub,
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
