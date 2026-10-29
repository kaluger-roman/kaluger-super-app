import { prisma } from "../lib/prisma";
import { isWebPushConfigured, sendWebPush } from "../lib/webPush";
import type { PushNotificationPayload } from "../types";

// Reminders go to the tutor's devices only (student subscriptions are for calls).
export const sendPushToUser = async (userId: string, payload: PushNotificationPayload) => {
  if (!isWebPushConfigured()) {
    throw new Error("VAPID ключи не настроены");
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const outcome = await sendWebPush(sub, payload);
    if (outcome === "delivered") sent++;
    else failed++;
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
  endTime: Date,
  timezone?: string | null
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
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    if (timezone) options.timeZone = timezone;
    return date.toLocaleTimeString("ru-RU", options);
  };

  const timePart = `${formatTime(startTime)}–${formatTime(endTime)}`;

  const tzLabel = timezone
    ? ` (${startTime.toLocaleTimeString("ru-RU", { timeZoneName: "short", timeZone: timezone }).split(" ").pop()})`
    : "";

  return `${subjectName} (${typeName}) — ${studentName}, ${timePart}${tzLabel}`;
};
