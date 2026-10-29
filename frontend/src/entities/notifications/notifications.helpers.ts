import type { SubscribeRequest, VapidKeyResponse } from "@shared";

import type {
  AutoSubscribeReady,
  AutoSubscribeState,
  PushPermissionState,
  ReminderSettings,
  SubscribePushParams,
  SubscriptionSyncReady,
  SubscriptionSyncState,
} from "./notifications.types";

export const readPushPermission = (): PushPermissionState =>
  typeof window !== "undefined" && "Notification" in window
    ? (Notification.permission as PushPermissionState)
    : "default";

export const toggleInterval = (
  settings: ReminderSettings,
  interval: number
): Partial<ReminderSettings> => {
  const newIntervals = settings.intervals.includes(interval)
    ? settings.intervals.filter((i) => i !== interval)
    : [...settings.intervals, interval];

  return { intervals: newIntervals };
};

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

export const toSubscribeRequest = (subscription: PushSubscription): SubscribeRequest => {
  const { keys } = subscription.toJSON();
  return {
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" },
    },
  };
};

// Must start inside the click that asked for it, or the browser does not show its permission
// dialog. The browser's own subscription is reused: only its binding on the server is renewed.
export const subscribeDevice = async (
  { registration, vapidKey }: SubscribePushParams,
  sendSubscription: (request: SubscribeRequest) => Promise<unknown>
): Promise<PushPermissionState> => {
  const permission = (await Notification.requestPermission()) as PushPermissionState;
  if (permission !== "granted") return permission;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));
  await sendSubscription(toSubscribeRequest(subscription));
  return permission;
};

// The browser keeps its subscription across logins: sending it again binds the device to the
// account signed in now (the server re-binds the endpoint to whoever proves to hold it).
export const syncDevice = async (
  registration: ServiceWorkerRegistration,
  sendSubscription: (request: SubscribeRequest) => Promise<unknown>
): Promise<boolean> => {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  await sendSubscription(toSubscribeRequest(subscription));
  return true;
};

// The browser subscription goes after the server's, so a server that missed the request gets
// "gone" on the next push and drops the row. A server error the caller does not ignore keeps both.
export const removeDevice = async (
  registration: ServiceWorkerRegistration,
  unsubscribe: (endpoint: string) => Promise<unknown>,
  isIgnorable: (error: unknown) => boolean = () => false
): Promise<void> => {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await unsubscribe(subscription.endpoint);
  } catch (error) {
    if (!isIgnorable(error)) throw error;
  }
  await subscription.unsubscribe();
};

// Reminders may ask for the permission on start, as before; calls alone only bring back a
// subscription the device already allowed (FR-021: no new permission requests on opening the app).
export const shouldAutoSubscribe = (state: AutoSubscribeState): state is AutoSubscribeReady => {
  const { attempted, isTutorSession, settingsLoaded, settings, subscribed, permission } = state;
  if (attempted || !isTutorSession || !settingsLoaded || subscribed) return false;
  if (state.vapidKey === null || state.reg === null) return false;
  return settings.enabled || (settings.callNotificationsEnabled && permission === "granted");
};

// A subscription the browser already holds may still be bound to the account signed in before (a
// student or another tutor): it is sent again once per tutor session while reminders or calls use it.
export const shouldSyncSubscription = (
  state: SubscriptionSyncState
): state is SubscriptionSyncReady => {
  const { synced, isTutorSession, settingsLoaded, settings, subscribed, permission } = state;
  if (synced || !isTutorSession || !settingsLoaded || !subscribed) return false;
  if (permission !== "granted" || state.reg === null) return false;
  return settings.enabled || settings.callNotificationsEnabled;
};

// The server may send an empty key with `configured: false` (a blank VAPID variable): then push is
// off (FR-025), whatever the key field holds.
export const toVapidKey = ({ vapidPublicKey, configured }: VapidKeyResponse): string | null =>
  configured && vapidPublicKey ? vapidPublicKey : null;
