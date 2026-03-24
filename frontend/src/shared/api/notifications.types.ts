export type VapidKeyResponse = {
  vapidPublicKey: string;
};

export type SubscribeRequest = {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  deviceName?: string;
};

export type PushSubscriptionInfo = {
  id: string;
  endpoint: string;
  deviceName: string | null;
  createdAt: string;
};

export type ReminderSettingsResponse = {
  enabled: boolean;
  intervals: number[];
  muteWhenInLesson: boolean;
};

export type UpdateReminderSettingsRequest = {
  enabled?: boolean;
  intervals?: number[];
  muteWhenInLesson?: boolean;
};
