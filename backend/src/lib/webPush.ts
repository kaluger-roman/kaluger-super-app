import webpush from "web-push";
import { prisma } from "./prisma";
import { deliverToTestPushSink } from "./testPushSink";
import type { WebPushDevice, WebPushOptions, WebPushOutcome } from "../types";

const isTestEnv = process.env.NODE_ENV === "test";

// A push service that does not answer must not hold a ringing call for long.
const WEB_PUSH_TIMEOUT_MS = 10_000;
const GONE_STATUSES = new Set([404, 410]);

type VapidDetails = { subject: string; publicKey: string; privateKey: string };

const readVapidDetails = (): VapidDetails | null => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null;
  return { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
};

export const isWebPushConfigured = (): boolean => readVapidDetails() !== null;

const forgetSubscription = async (id: string): Promise<void> => {
  await prisma.pushSubscription.delete({ where: { id } }).catch(() => undefined);
};

export const sendWebPush = async (
  device: WebPushDevice,
  payload: unknown,
  options?: WebPushOptions
): Promise<WebPushOutcome> => {
  const vapidDetails = readVapidDetails();
  if (!vapidDetails) return "failed";
  const subscription = {
    endpoint: device.endpoint,
    keys: { p256dh: device.p256dh, auth: device.auth },
  };
  const body = JSON.stringify(payload);
  const requestOptions = { ...options, vapidDetails, timeout: WEB_PUSH_TIMEOUT_MS };
  try {
    if (!(isTestEnv && deliverToTestPushSink(subscription, body, requestOptions))) {
      await webpush.sendNotification(subscription, body, requestOptions);
    }
    return "delivered";
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== undefined && GONE_STATUSES.has(statusCode)) {
      await forgetSubscription(device.id);
      return "gone";
    }
    console.error(`Push delivery failed for subscription ${device.id}:`, error);
    return "failed";
  }
};
