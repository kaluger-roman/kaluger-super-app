import type { ReminderSettings } from "./notifications.types";

export const toggleInterval = (settings: ReminderSettings, interval: number): Partial<ReminderSettings> => {
  const newIntervals = settings.intervals.includes(interval)
    ? settings.intervals.filter((i) => i !== interval)
    : [...settings.intervals, interval];

  return { intervals: newIntervals };
};

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
