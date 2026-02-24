import { api } from "./base";

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

export const notificationsApi = {
  getVapidKey: async (): Promise<VapidKeyResponse> => {
    const response = await api.get("/push/vapid-key");
    return response.data;
  },

  subscribe: async (data: SubscribeRequest): Promise<PushSubscriptionInfo> => {
    const response = await api.post("/push/subscribe", data);
    return response.data;
  },

  unsubscribe: async (endpoint: string): Promise<void> => {
    await api.delete("/push/unsubscribe", { data: { endpoint } });
  },

  getSubscriptions: async (): Promise<{ subscriptions: PushSubscriptionInfo[] }> => {
    const response = await api.get("/push/subscriptions");
    return response.data;
  },

  getSettings: async (): Promise<ReminderSettingsResponse> => {
    const response = await api.get("/reminder-settings");
    return response.data;
  },

  updateSettings: async (data: UpdateReminderSettingsRequest): Promise<ReminderSettingsResponse> => {
    const response = await api.put("/reminder-settings", data);
    return response.data;
  },
};
