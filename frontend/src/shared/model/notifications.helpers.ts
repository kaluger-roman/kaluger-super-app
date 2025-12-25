import { showNotification } from "./notifications.model";

export const showSuccess = (message: string) => showNotification({ message, type: "success" });

export const showError = (message: string) => showNotification({ message, type: "error" });

export const showWarning = (message: string) => showNotification({ message, type: "warning" });

export const showInfo = (message: string) => showNotification({ message, type: "info" });
