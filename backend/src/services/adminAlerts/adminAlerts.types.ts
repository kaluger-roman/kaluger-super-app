import type {
  AdminAlert,
  AdminAlertEmailStatus,
  AdminAlertSeverity,
  AdminSettings,
} from "@prisma/client";

// `null` means "no data": the current state of the alert is kept.
export type AlertCheckResult =
  { active: true; description: string; eventKey?: string } | { active: false } | null;

export type AlertCheckContext = { now: Date; activeAlert: AdminAlert | null };

export type AdminAlertDefinition = {
  type: string;
  severity: AdminAlertSeverity;
  title: string;
  check?: (context: AlertCheckContext) => Promise<AlertCheckResult>;
};

export type AlertOccurrence = { description: string; eventKey?: string };

export type AlertEmailKind = "open" | "resolve";

export type AlertEmailSettings = Pick<AdminSettings, "alertEmail" | "alertEmailEnabled">;

export type AlertEmailRecipient =
  { status: "pending"; to: string } | { status: "skipped_no_email" | "skipped_disabled" };

export type AlertEmailContent = { subject: string; html: string };

export type AlertEmailState = { status: AdminAlertEmailStatus | null; attempts: number };

// `undefined` fields are left unchanged by Prisma.
export type AlertEmailUpdate = {
  status?: AdminAlertEmailStatus;
  attempts?: number;
  error?: string | null;
};
