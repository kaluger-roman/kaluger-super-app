import * as notificationsModel from "./notifications.model";

export const showSuccess = (message: string) =>
  notificationsModel.showNotification({ message, type: "success" });

export const showError = (message: string) =>
  notificationsModel.showNotification({ message, type: "error" });

export const showWarning = (message: string) =>
  notificationsModel.showNotification({ message, type: "warning" });

export const showInfo = (message: string) =>
  notificationsModel.showNotification({ message, type: "info" });
