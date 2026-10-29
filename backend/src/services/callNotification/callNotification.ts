import type { Prisma, PushChannel, PushSubscription } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { MAX_PUSH_SUBSCRIPTIONS_PER_OWNER } from "../pushSubscription";
import type {
  CallNotificationChannel,
  CallNotificationMessage,
  CallNotificationRecipient,
  DeliveryOutcome,
} from "./callNotification.types";
import { webPushChannel } from "./webPushChannel";

const CHANNELS: Record<PushChannel, CallNotificationChannel> = {
  WEB_PUSH: webPushChannel,
};

const configuredChannels = (): PushChannel[] =>
  Object.values(CHANNELS)
    .filter((channel) => channel.isConfigured())
    .map(({ channel }) => channel);

// Only devices a configured channel can reach count; a tutor may turn call notifications off
// (no settings row means they are on).
const toDeviceFilter = async (
  recipient: CallNotificationRecipient
): Promise<Prisma.PushSubscriptionWhereInput | null> => {
  const channels = configuredChannels();
  if (channels.length === 0) return null;
  if (recipient.kind === "student") {
    return { studentUserId: recipient.id, channel: { in: channels } };
  }
  const settings = await prisma.reminderSettings.findUnique({
    where: { userId: recipient.id },
    select: { callNotificationsEnabled: true },
  });
  if (settings?.callNotificationsEnabled === false) return null;
  return { userId: recipient.id, channel: { in: channels } };
};

// The newest devices only: rows registered before the per-owner cap must not widen the fan-out.
const findDevices = async (recipient: CallNotificationRecipient): Promise<PushSubscription[]> => {
  const where = await toDeviceFilter(recipient);
  if (!where) return [];
  return prisma.pushSubscription.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_PUSH_SUBSCRIPTIONS_PER_OWNER,
  });
};

const deliverToAll = async (
  recipient: CallNotificationRecipient,
  message: CallNotificationMessage
): Promise<DeliveryOutcome[]> => {
  const devices = await findDevices(recipient);
  return Promise.all(devices.map((device) => CHANNELS[device.channel].deliver(device, message)));
};

export const hasCallNotificationDevices = async (
  recipient: CallNotificationRecipient
): Promise<boolean> => {
  const where = await toDeviceFilter(recipient);
  return where !== null && (await prisma.pushSubscription.count({ where })) > 0;
};

// Resolves with the number of devices that took the notification; never rejects.
export const notifyIncomingCall = async (
  recipient: CallNotificationRecipient,
  message: CallNotificationMessage
): Promise<number> => {
  try {
    const outcomes = await deliverToAll(recipient, message);
    return outcomes.filter((outcome) => outcome === "delivered").length;
  } catch (error) {
    console.error("Incoming call notification failed:", error);
    return 0;
  }
};

export const notifyCallClosed = async (
  recipient: CallNotificationRecipient,
  message: CallNotificationMessage
): Promise<void> => {
  try {
    await deliverToAll(recipient, message);
  } catch (error) {
    console.error("Closing call notification failed:", error);
  }
};
