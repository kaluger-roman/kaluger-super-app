import { createStore, createEvent, createEffect, sample, combine } from "effector";

import { notificationsApi } from "@shared";

import { urlBase64ToUint8Array } from "./notifications.helpers";
import type { ReminderSettings, PushPermissionState } from "./notifications.types";

// Stores
export const $vapidKey = createStore<string | null>(null);
export const $pushPermission = createStore<PushPermissionState>(
  typeof window !== "undefined" && "Notification" in window
    ? (Notification.permission as PushPermissionState)
    : "default"
);
export const $isPushSupported = createStore(
  typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator
);
export const $isPushSubscribed = createStore(false);
export const $reminderSettings = createStore<ReminderSettings>({
  enabled: false,
  intervals: [],
  muteWhenInLesson: false,
});
export const $serviceWorkerRegistration = createStore<ServiceWorkerRegistration | null>(null);

// Events
export const loadSettings = createEvent();
export const settingsUpdated = createEvent<Partial<ReminderSettings>>();
export const serviceWorkerRegistered = createEvent<ServiceWorkerRegistration | null>();
export const remindersToggled = createEvent();
export const intervalToggled = createEvent<number>();
export const muteToggled = createEvent();

// Effects
export const loadVapidKeyFx = createEffect(async () => {
  const result = await notificationsApi.getVapidKey();
  return result.vapidPublicKey;
});

export const subscribePushFx = createEffect(
  async ({ vapidKey, registration }: { vapidKey: string; registration: ServiceWorkerRegistration }) => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Разрешение на уведомления не предоставлено");
    }

    const existingSub = await registration.pushManager.getSubscription();

    // FR-025: reuse existing subscription if valid, only re-register on backend
    if (existingSub) {
      const subJson = existingSub.toJSON();

      const result = await notificationsApi.subscribe({
        subscription: {
          endpoint: existingSub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh ?? "",
            auth: subJson.keys?.auth ?? "",
          },
        },
      });

      return { subscription: existingSub, serverResponse: result };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subJson = subscription.toJSON();

    const result = await notificationsApi.subscribe({
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
        },
      },
    });

    return { subscription, serverResponse: result };
  }
);

export const unsubscribePushFx = createEffect(async (registration: ServiceWorkerRegistration) => {
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await notificationsApi.unsubscribe(subscription.endpoint);
    await subscription.unsubscribe();
  }
});

export const loadSettingsFx = createEffect(async () => {
  return await notificationsApi.getSettings();
});

export const updateSettingsFx = createEffect(async (data: Partial<ReminderSettings>) => {
  return await notificationsApi.updateSettings(data);
});

export const checkPushSubscriptionFx = createEffect(async (registration: ServiceWorkerRegistration) => {
  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
});

export const $isSettingsLoading = loadSettingsFx.pending;
export const $isToggling = combine(
  subscribePushFx.pending,
  unsubscribePushFx.pending,
  updateSettingsFx.pending,
  (subscribing, unsubscribing, updating) => subscribing || unsubscribing || updating
);

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

