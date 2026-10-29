import type { PushSubscriptionInfo, SubscribeRequest } from "./notifications.types";
import { studentApi } from "./studentBase";

export const studentPushApi = {
  subscribe: async (data: SubscribeRequest): Promise<PushSubscriptionInfo> => {
    const response = await studentApi.post("/student-push/subscribe", data);
    return response.data;
  },

  unsubscribe: async (endpoint: string): Promise<void> => {
    await studentApi.delete("/student-push/unsubscribe", { data: { endpoint } });
  },
};
