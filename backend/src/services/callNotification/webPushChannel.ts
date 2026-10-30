import { isWebPushConfigured, sendWebPush } from "../../lib/webPush";
import { toWebPushOptions, toWebPushPayload } from "./callNotification.helpers";
import type { CallNotificationChannel } from "./callNotification.types";

export const webPushChannel: CallNotificationChannel = {
  channel: "WEB_PUSH",
  isConfigured: isWebPushConfigured,
  deliver: (device, message) =>
    sendWebPush(device, toWebPushPayload(message), toWebPushOptions(message)),
};
