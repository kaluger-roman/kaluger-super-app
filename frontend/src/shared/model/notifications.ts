import { createStore, createEvent } from "effector";

export type NotificationType = "success" | "error" | "warning" | "info";

export type Notification = {
  message: string;
  type: NotificationType;
  id?: string;
} | null;

export const showNotification = createEvent<{
  message: string;
  type: NotificationType;
}>();

export const hideNotification = createEvent();

export const $notification = createStore<Notification>(null)
  .on(showNotification, (_, { message, type }) => ({
    message,
    type,
    id: Date.now().toString(),
  }))
  .on(hideNotification, () => null);

// Хелперы для удобства
export const showSuccess = (message: string) =>
  showNotification({ message, type: "success" });

export const showError = (message: string) =>
  showNotification({ message, type: "error" });

export const showWarning = (message: string) =>
  showNotification({ message, type: "warning" });

export const showInfo = (message: string) =>
  showNotification({ message, type: "info" });
