import type {
  CallNotificationsSource,
  CallNotificationsTarget,
  CallPhase,
  LateNotificationsSource,
  TerminatedCall,
} from "./call.types";
import {
  CALL_NOTIFICATION_SHOWN_MESSAGE,
  CALL_NOTIFICATION_TAG_PREFIX,
} from "./callNotificationOpen.constants";

export const isRegistration = (
  registration: ServiceWorkerRegistration | null
): registration is ServiceWorkerRegistration => registration !== null;

// Null without a subscription, or where the browser has no push at all.
export const readPushEndpoint = async (
  registration: ServiceWorkerRegistration
): Promise<string | null> => {
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
};

export const toIncomingRegistration = (
  phase: CallPhase,
  registration: ServiceWorkerRegistration | null
): ServiceWorkerRegistration | null => (phase === "incoming" ? registration : null);

export const toAnsweredNotifications = ({
  registration,
  callId,
}: CallNotificationsSource): CallNotificationsTarget | null =>
  registration && callId ? { registration, callId } : null;

export const toRejectedCallId = ({ address, signal }: TerminatedCall): string | null =>
  address && signal?.type === "call_reject" ? address.callId : null;

export const isCallId = (callId: string | null): callId is string => callId !== null;

export const readShownCallId = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) return null;
  if (!("type" in data) || data.type !== CALL_NOTIFICATION_SHOWN_MESSAGE) return null;
  return "callId" in data && typeof data.callId === "string" && data.callId ? data.callId : null;
};

// A late incoming notification is closed only on the page that took or declined that call.
export const toLateNotifications = (
  { registration, answeredHere }: LateNotificationsSource,
  shownCallId: string | null
): CallNotificationsTarget | null =>
  registration && shownCallId && shownCallId === answeredHere
    ? { registration, callId: shownCallId }
    : null;

export const isCallNotificationsTarget = (
  target: CallNotificationsTarget | null
): target is CallNotificationsTarget => target !== null;

export const closeCallNotifications = async ({
  registration,
  callId,
}: CallNotificationsTarget): Promise<void> => {
  const notifications = await registration.getNotifications({
    tag: `${CALL_NOTIFICATION_TAG_PREFIX}${callId}`,
  });
  notifications.forEach((notification) => notification.close());
};
