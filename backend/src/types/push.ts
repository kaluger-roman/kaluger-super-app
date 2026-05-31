export type PushSubscriptionDto = {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  deviceName?: string;
};

export type PushUnsubscribeDto = {
  endpoint: string;
};

export type ReminderSettingsDto = {
  enabled?: boolean;
  intervals?: number[];
  muteWhenInLesson?: boolean;
};

export type ReminderSettingsResponse = {
  enabled: boolean;
  intervals: number[];
  muteWhenInLesson: boolean;
};

export type PushSubscriptionResponse = {
  id: string;
  endpoint: string;
  deviceName: string | null;
  createdAt: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  tag: string;
  data: {
    type: "lesson_reminder";
    lessonId: string;
    url: string;
  };
};
