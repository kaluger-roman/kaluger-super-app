import { createStore, createEvent, createEffect, sample } from "effector";

import { notificationsApi } from "@shared";

import type { ReminderSettings, PushPermissionState } from "./notifications.types";

// Events
export const subscribePush = createEvent();
export const unsubscribePush = createEvent();
export const loadSettings = createEvent();
export const settingsUpdated = createEvent<Partial<ReminderSettings>>();
export const serviceWorkerRegistered = createEvent<ServiceWorkerRegistration | null>();

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
    if (existingSub) {
      await existingSub.unsubscribe();
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

// Stores
export const $vapidKey = createStore<string | null>(null);
export const $pushPermission = createStore<PushPermissionState>("default");
export const $isPushSupported = createStore(
  typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator
);
export const $isPushSubscribed = createStore(false);
export const $reminderSettings = createStore<ReminderSettings>({
  enabled: false,
  intervals: [],
  muteWhenInLesson: false,
});
export const $isSettingsLoading = loadSettingsFx.pending;
export const $serviceWorkerRegistration = createStore<ServiceWorkerRegistration | null>(null);

// Service worker registration
sample({
  clock: serviceWorkerRegistered,
  target: $serviceWorkerRegistration,
});

// VAPID key loading
sample({
  clock: loadVapidKeyFx.doneData,
  target: $vapidKey,
});

// Push subscription
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

// Settings
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

// Helper to convert VAPID key
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
