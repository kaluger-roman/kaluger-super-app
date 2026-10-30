import type { AdminAlert } from "@shared";

export const getActiveAlerts = (alerts: AdminAlert[]): AdminAlert[] =>
  alerts.filter((alert) => !alert.resolvedAt);

export const getResolvedAlerts = (alerts: AdminAlert[]): AdminAlert[] =>
  alerts.filter((alert) => Boolean(alert.resolvedAt));

export const countUnreadActiveAlerts = (alerts: AdminAlert[]): number =>
  alerts.filter((alert) => !alert.resolvedAt && !alert.readAt).length;

export const hasCriticalAlert = (alerts: AdminAlert[]): boolean =>
  alerts.some((alert) => alert.severity === "critical");
