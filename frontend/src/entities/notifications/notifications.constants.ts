import type { ReminderSettings } from "./notifications.types";

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  intervals: [],
  muteWhenInLesson: false,
  callNotificationsEnabled: true,
};

export const PERMISSION_NOT_GRANTED_ERROR = "Разрешение на уведомления не предоставлено";
