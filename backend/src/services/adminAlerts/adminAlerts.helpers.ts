import type { AdminAlert, AdminAlertEmailStatus, Prisma } from "@prisma/client";
import type { AdminAlertDto } from "../../types";
import {
  ALERT_EMAIL_TIME_ZONE,
  ALERT_SEVERITY_LABELS,
  ALERT_SEVERITY_ORDER,
  HTML_ESCAPES,
  MAX_EMAIL_ATTEMPTS,
  MS_PER_DAY,
  RETRYABLE_EMAIL_STATUSES,
  RESOLVED_SUBJECT_PREFIX,
  TEST_EMAIL_SUBJECT,
} from "./adminAlerts.constants";
import type {
  AlertEmailContent,
  AlertEmailKind,
  AlertEmailRecipient,
  AlertEmailSettings,
  AlertEmailState,
  AlertEmailUpdate,
} from "./adminAlerts.types";

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const truncateText = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

export const getOpenEmailStatus = ({
  alertEmail,
  alertEmailEnabled,
}: AlertEmailSettings): AdminAlertEmailStatus => {
  if (!alertEmail) return "skipped_no_email";
  if (!alertEmailEnabled) return "skipped_disabled";
  return "pending";
};

export const isSkippedEmailStatus = (
  status: AdminAlertEmailStatus | null
): status is "skipped_no_email" | "skipped_disabled" =>
  status === "skipped_no_email" || status === "skipped_disabled";

const isRetryableEmailStatus = (status: AdminAlertEmailStatus | null): boolean =>
  status !== null && (RETRYABLE_EMAIL_STATUSES as readonly string[]).includes(status);

export const isOpenLetterDue = (
  alert: Pick<AdminAlert, "openEmailStatus" | "openEmailAttempts">
): boolean =>
  isRetryableEmailStatus(alert.openEmailStatus) && alert.openEmailAttempts < MAX_EMAIL_ATTEMPTS;

// A resolve letter waits until its open letter was sent or gave up, so the admin never
// reads «[Решено]» before the problem itself. A `pending` open letter with every attempt
// used means the process died between the claim and the result.
export const isResolveLetterDue = (
  alert: Pick<
    AdminAlert,
    "openEmailStatus" | "openEmailAttempts" | "resolveEmailStatus" | "resolveEmailAttempts"
  >
): boolean =>
  isRetryableEmailStatus(alert.resolveEmailStatus) &&
  alert.resolveEmailAttempts < MAX_EMAIL_ATTEMPTS &&
  !isOpenLetterDue(alert);

// A resolve letter of an episode whose open letter was skipped is skipped the same way.
export const getEmailRecipient = (
  { alertEmail, alertEmailEnabled }: AlertEmailSettings,
  alert: Pick<AdminAlert, "openEmailStatus">,
  kind: AlertEmailKind
): AlertEmailRecipient => {
  if (kind === "resolve" && isSkippedEmailStatus(alert.openEmailStatus)) {
    return { status: alert.openEmailStatus };
  }
  if (!alertEmail) return { status: "skipped_no_email" };
  if (!alertEmailEnabled) return { status: "skipped_disabled" };
  return { status: "pending", to: alertEmail };
};

export const getResolveEmailStatus = (openStatus: AdminAlertEmailStatus): AdminAlertEmailStatus =>
  isSkippedEmailStatus(openStatus) ? openStatus : "pending";

export const getNextOccurrences = (
  { occurrences, eventKey }: Pick<AdminAlert, "occurrences" | "eventKey">,
  newEventKey: string | undefined
): number => (newEventKey && newEventKey !== eventKey ? occurrences + 1 : occurrences);

export const compareAlerts = (a: AdminAlert, b: AdminAlert): number => {
  if (!a.resolvedAt && b.resolvedAt) return -1;
  if (a.resolvedAt && !b.resolvedAt) return 1;
  if (a.resolvedAt && b.resolvedAt) return b.resolvedAt.getTime() - a.resolvedAt.getTime();

  const bySeverity = ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity];
  return bySeverity !== 0 ? bySeverity : b.openedAt.getTime() - a.openedAt.getTime();
};

export const getRetentionCutoff = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * MS_PER_DAY);

export const getEmailState = (alert: AdminAlert, kind: AlertEmailKind): AlertEmailState =>
  kind === "open"
    ? { status: alert.openEmailStatus, attempts: alert.openEmailAttempts }
    : { status: alert.resolveEmailStatus, attempts: alert.resolveEmailAttempts };

// Matches the letter only while it is still waiting for an attempt; with `attempts`
// it also matches only the attempt count read before, so one claimant wins.
export const getRetryableEmailWhere = (
  id: string,
  kind: AlertEmailKind,
  attempts?: number
): Prisma.AdminAlertWhereInput =>
  kind === "open"
    ? {
        id,
        openEmailStatus: { in: [...RETRYABLE_EMAIL_STATUSES] },
        openEmailAttempts: attempts,
      }
    : {
        id,
        resolveEmailStatus: { in: [...RETRYABLE_EMAIL_STATUSES] },
        resolveEmailAttempts: attempts,
      };

export const toEmailUpdate = (
  kind: AlertEmailKind,
  { status, attempts, error }: AlertEmailUpdate
): Prisma.AdminAlertUpdateManyMutationInput =>
  kind === "open"
    ? { openEmailStatus: status, openEmailAttempts: attempts, openEmailError: error }
    : { resolveEmailStatus: status, resolveEmailAttempts: attempts, resolveEmailError: error };

export const toAlertDto = (alert: AdminAlert): AdminAlertDto => ({
  id: alert.id,
  type: alert.type,
  severity: alert.severity,
  title: alert.title,
  description: alert.description,
  openedAt: alert.openedAt.toISOString(),
  lastSeenAt: alert.lastSeenAt.toISOString(),
  occurrences: alert.occurrences,
  resolvedAt: alert.resolvedAt?.toISOString() ?? null,
  readAt: alert.readAt?.toISOString() ?? null,
  openEmail: {
    status: alert.openEmailStatus,
    attempts: alert.openEmailAttempts,
    lastError: alert.openEmailError,
  },
  resolveEmail:
    alert.resolvedAt && alert.resolveEmailStatus
      ? {
          status: alert.resolveEmailStatus,
          attempts: alert.resolveEmailAttempts,
          lastError: alert.resolveEmailError,
        }
      : null,
});

export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const moscowDateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: ALERT_EMAIL_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatMoscowDateTime = (date: Date): string => {
  const parts = Object.fromEntries(
    moscowDateTimeFormat.formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute} (МСК)`;
};

const renderLetter = (heading: string, paragraphs: string[], adminUrl: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>${escapeHtml(heading)}</h2>
    ${paragraphs.join("\n    ")}
    <p style="margin: 32px 0;">
      <a href="${escapeHtml(adminUrl)}" style="background-color: #1976d2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
        Открыть админку
      </a>
    </p>
  </div>
`;

export const buildAlertEmail = (
  alert: Pick<AdminAlert, "severity" | "title" | "description" | "openedAt" | "resolvedAt">,
  kind: AlertEmailKind,
  adminUrl: string
): AlertEmailContent => {
  const severityLabel = ALERT_SEVERITY_LABELS[alert.severity];
  const isResolve = kind === "resolve";
  const subjectPrefix = isResolve ? RESOLVED_SUBJECT_PREFIX : `[${severityLabel}]`;
  const status = isResolve ? "Проблема решена" : `Уровень: ${severityLabel}`;

  const paragraphs = [
    `<p><strong>${escapeHtml(status)}</strong></p>`,
    `<p style="white-space: pre-wrap;">${escapeHtml(alert.description)}</p>`,
    `<p>Началось: ${escapeHtml(formatMoscowDateTime(alert.openedAt))}</p>`,
  ];
  if (isResolve && alert.resolvedAt) {
    paragraphs.push(`<p>Закрыто: ${escapeHtml(formatMoscowDateTime(alert.resolvedAt))}</p>`);
  }

  return {
    subject: `${subjectPrefix} ${alert.title}`,
    html: renderLetter(alert.title, paragraphs, adminUrl),
  };
};

export const buildTestEmail = (adminUrl: string): AlertEmailContent => ({
  subject: TEST_EMAIL_SUBJECT,
  html: renderLetter(
    TEST_EMAIL_SUBJECT,
    ["<p>Это тестовое письмо: уведомления об алертах будут приходить на этот адрес.</p>"],
    adminUrl
  ),
});
