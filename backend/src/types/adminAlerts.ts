import type { AdminAlertEmailStatus, AdminAlertSeverity } from "@prisma/client";

export type AdminAlertEmailDto = {
  status: AdminAlertEmailStatus;
  attempts: number;
  lastError: string | null;
};

export type AdminAlertDto = {
  id: string;
  type: string;
  severity: AdminAlertSeverity;
  title: string;
  description: string;
  openedAt: string;
  lastSeenAt: string;
  occurrences: number;
  resolvedAt: string | null;
  readAt: string | null;
  openEmail: AdminAlertEmailDto;
  resolveEmail: AdminAlertEmailDto | null;
};

export type AdminAlertsResponse = { alerts: AdminAlertDto[] };

export type AdminSettingsDto = { alertEmail: string | null; alertEmailEnabled: boolean };

export type UpdateAdminSettingsDto = { alertEmail?: unknown; alertEmailEnabled?: unknown };

export type TestEmailResponse = { sentTo: string };
