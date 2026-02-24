export type ReminderSettings = {
  enabled: boolean;
  intervals: number[];
  muteWhenInLesson: boolean;
};

export type PushSubscriptionInfo = {
  id: string;
  endpoint: string;
  deviceName: string | null;
  createdAt: string;
};

export type VapidKeyResponse = {
  vapidPublicKey: string;
};

export type PushPermissionState = "default" | "granted" | "denied";
