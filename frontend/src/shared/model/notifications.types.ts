export type NotificationType = "success" | "error" | "warning" | "info";

export type Notification = {
  message: string;
  type: NotificationType;
  id?: string;
} | null;
