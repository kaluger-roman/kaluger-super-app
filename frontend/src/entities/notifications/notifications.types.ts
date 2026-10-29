export type ReminderSettings = {
  enabled: boolean;
  intervals: number[];
  muteWhenInLesson: boolean;
  callNotificationsEnabled: boolean;
};

export type PushPermissionState = "default" | "granted" | "denied";

export type SubscribePushParams = {
  vapidKey: string;
  registration: ServiceWorkerRegistration;
};

export type AutoSubscribeState = {
  attempted: boolean;
  isTutorSession: boolean;
  settingsLoaded: boolean;
  settings: ReminderSettings;
  subscribed: boolean;
  permission: PushPermissionState;
  vapidKey: string | null;
  reg: ServiceWorkerRegistration | null;
};

export type AutoSubscribeReady = AutoSubscribeState & {
  vapidKey: string;
  reg: ServiceWorkerRegistration;
};

export type SubscriptionSyncState = {
  synced: boolean;
  isTutorSession: boolean;
  settingsLoaded: boolean;
  settings: ReminderSettings;
  subscribed: boolean;
  permission: PushPermissionState;
  reg: ServiceWorkerRegistration | null;
};

export type SubscriptionSyncReady = SubscriptionSyncState & {
  reg: ServiceWorkerRegistration;
};
