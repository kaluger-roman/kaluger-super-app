import webpush from "web-push";
import prisma from "../lib/prisma";
import type { PushNotificationPayload } from "../types";

let vapidConfigured = false;

const ensureVapidConfigured = () => {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID ключи не настроены");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
};

export const sendPushToUser = async (userId: string, payload: PushNotificationPayload) => {
  ensureVapidConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;

      // Remove stale subscriptions (gone or not found)
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        }).catch(() => {
          // Ignore if already deleted
        });
      }

      failed++;
      console.error(`Push delivery failed for subscription ${sub.id}:`, error);
    }
  }

  return { sent, failed };
};

export const formatReminderTitle = (intervalMinutes: number): string => {
  if (intervalMinutes === 60) {
    return "Урок через 1 час";
  }
  return `Урок через ${intervalMinutes} минут`;
};

export const formatReminderBody = (
  subject: string,
  lessonType: string,
  studentName: string,
  startTime: Date,
  endTime: Date
): string => {
  const subjectMap: Record<string, string> = {
    MATHEMATICS: "Математика",
    PHYSICS: "Физика",
  };

  const lessonTypeMap: Record<string, string> = {
    EGE: "ЕГЭ",
    OGE: "ОГЭ",
    OLYMPICS: "Олимпиады",
    SCHOOL: "Школа",
  };

  const subjectName = subjectMap[subject] || subject;
  const typeName = lessonTypeMap[lessonType] || lessonType;

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return `${subjectName} (${typeName}) — ${studentName}, ${formatTime(startTime)}–${formatTime(endTime)}`;
};
