import type { PushChannel, PushSubscription } from "@prisma/client";
import type { CallerKindValue, WebPushOutcome } from "../../types";

export type CallNotificationRecipient = {
  kind: CallerKindValue;
  id: string;
};

export type CallNotificationKind = "incoming_call" | "missed_call" | "call_closed";

export type CallNotificationMessage = {
  kind: CallNotificationKind;
  callId: string;
  callerName: string;
  // The page the notification opens belongs to the recipient's role.
  recipientKind: CallerKindValue;
};

export type DeliveryOutcome = WebPushOutcome;

// One way to reach a device (Web Push now; APNs VoIP / FCM of the native shell later, FR-028).
export type CallNotificationChannel = {
  channel: PushChannel;
  isConfigured: () => boolean;
  deliver: (device: PushSubscription, message: CallNotificationMessage) => Promise<DeliveryOutcome>;
};

export type CallPushPayload = {
  title: string;
  body: string;
  tag: string;
  data: {
    type: CallNotificationKind;
    callId: string;
    url: string;
  };
};
