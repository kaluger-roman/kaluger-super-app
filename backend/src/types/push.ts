import type { PushSubscription } from "@prisma/client";

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
  callNotificationsEnabled?: boolean;
};

export type ReminderSettingsResponse = {
  enabled: boolean;
  intervals: number[];
  muteWhenInLesson: boolean;
  callNotificationsEnabled: boolean;
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

export type WebPushUrgency = "very-low" | "low" | "normal" | "high";

export type WebPushOptions = {
  TTL: number;
  urgency: WebPushUrgency;
  // ≤32 URL-safe base64 characters: a newer push with the same topic replaces an undelivered one.
  topic?: string;
};

// "gone": the push service no longer knows the subscription, and it was deleted.
export type WebPushOutcome = "delivered" | "gone" | "failed";

export type WebPushDevice = Pick<PushSubscription, "id" | "endpoint" | "p256dh" | "auth">;
