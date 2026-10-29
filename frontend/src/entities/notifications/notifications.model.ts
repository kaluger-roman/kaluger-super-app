import { combine, createStore, createEvent, createEffect, sample } from "effector";

import { notificationsApi, showNotification } from "@shared";

import { DEFAULT_REMINDER_SETTINGS, PERMISSION_NOT_GRANTED_ERROR } from "./notifications.constants";
import {
  readPushPermission,
  removeDevice,
  subscribeDevice,
  syncDevice,
  toVapidKey,
} from "./notifications.helpers";
import type {
  ReminderSettings,
  PushPermissionState,
  SubscribePushParams,
} from "./notifications.types";

// Stores
export const $vapidKey = createStore<string | null>(null);
export const $pushPermission = createStore<PushPermissionState>(readPushPermission());
export const $isPushPermissionDenied = $pushPermission.map((permission) => permission === "denied");
export const $isPushSupported = createStore(
  typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator
);
export const $isPushSubscribed = createStore(false);
export const $reminderSettings = createStore<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
export const $callNotificationsEnabled = $reminderSettings.map(
  ({ callNotificationsEnabled }) => callNotificationsEnabled
);
export const $serviceWorkerRegistration = createStore<ServiceWorkerRegistration | null>(null);
export const $canSubscribePush = combine(
  $isPushSupported,
  $vapidKey,
  $serviceWorkerRegistration,
  (supported, key, reg) => supported && key !== null && reg !== null
);
// Whether calls reach this device (FR-021). A device that cannot hold a subscription shows the
// account setting, which still decides the delivery to the tutor's other devices.
export const $isCallNotificationsOn = combine(
  $callNotificationsEnabled,
  $isPushSubscribed,
  $canSubscribePush,
  (enabled, subscribed, canSubscribe) => enabled && (subscribed || !canSubscribe)
);

// Events
export const loadSettings = createEvent();
export const settingsUpdated = createEvent<Partial<ReminderSettings>>();
export const serviceWorkerRegistered = createEvent<ServiceWorkerRegistration | null>();
export const remindersToggled = createEvent();
export const intervalToggled = createEvent<number>();
export const muteToggled = createEvent();
export const callNotificationsToggled = createEvent();

// Effects
export const loadVapidKeyFx = createEffect(async () =>
  toVapidKey(await notificationsApi.getVapidKey())
);

export const subscribePushFx = createEffect(async (params: SubscribePushParams): Promise<void> => {
  const permission = await subscribeDevice(params, notificationsApi.subscribe);
  if (permission !== "granted") throw new Error(PERMISSION_NOT_GRANTED_ERROR);
});

// The permission changes without an event the app listens to (a refusal in the system dialog, the
// browser or phone settings): it is read again after a failed subscribe and when the app comes back.
export const readPushPermissionFx = createEffect(readPushPermission);

export const unsubscribePushFx = createEffect((registration: ServiceWorkerRegistration) =>
  removeDevice(registration, notificationsApi.unsubscribe)
);

export const syncSubscriptionFx = createEffect(
  (registration: ServiceWorkerRegistration): Promise<boolean> =>
    syncDevice(registration, notificationsApi.subscribe)
);

export const loadSettingsFx = createEffect(async () => {
  return await notificationsApi.getSettings();
});

export const updateSettingsFx = createEffect(async (data: Partial<ReminderSettings>) => {
  return await notificationsApi.updateSettings(data);
});

export const checkPushSubscriptionFx = createEffect(
  async (registration: ServiceWorkerRegistration) => {
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  }
);

export const $isSettingsLoading = loadSettingsFx.pending;

// Samples
sample({
  clock: serviceWorkerRegistered,
  target: $serviceWorkerRegistration,
});

// Check real push subscription state when SW is registered
sample({
  clock: serviceWorkerRegistered,
  filter: (reg): reg is ServiceWorkerRegistration => reg !== null,
  target: checkPushSubscriptionFx,
});

sample({
  clock: checkPushSubscriptionFx.doneData,
  target: $isPushSubscribed,
});

sample({
  clock: loadVapidKeyFx.doneData,
  target: $vapidKey,
});

sample({
  clock: subscribePushFx.doneData,
  fn: () => true,
  target: $isPushSubscribed,
});

sample({
  clock: subscribePushFx.doneData,
  fn: (): PushPermissionState => "granted",
  target: $pushPermission,
});

sample({
  clock: subscribePushFx.fail,
  fn: () => undefined,
  target: readPushPermissionFx,
});

sample({
  clock: readPushPermissionFx.doneData,
  target: $pushPermission,
});

sample({
  clock: unsubscribePushFx.done,
  fn: () => false,
  target: $isPushSubscribed,
});

sample({
  clock: loadSettings,
  target: loadSettingsFx,
});

sample({
  clock: loadSettingsFx.doneData,
  target: $reminderSettings,
});

sample({
  clock: settingsUpdated,
  target: updateSettingsFx,
});

sample({
  clock: updateSettingsFx.doneData,
  target: $reminderSettings,
});

// Toast feedback on settings update
sample({
  clock: updateSettingsFx.doneData,
  fn: () => ({ message: "Настройки обновлены", type: "success" as const }),
  target: showNotification,
});

sample({
  clock: subscribePushFx.fail,
  fn: () => ({ message: "Не удалось подписаться на уведомления", type: "error" as const }),
  target: showNotification,
});
