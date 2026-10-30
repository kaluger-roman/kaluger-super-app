export const ADMIN_SETTINGS_ID = "admin-settings-singleton";

export const MAX_EMAIL_ATTEMPTS = 5;
export const ALERT_RETENTION_DAYS = 90;
export const ALERT_DESCRIPTION_MAX_LENGTH = 1000;
export const EMAIL_ERROR_MAX_LENGTH = 500;
export const TEST_EMAIL_INTERVAL_MS = 60_000;
export const ALERT_EMAIL_TIME_ZONE = "Europe/Moscow";
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const RETRYABLE_EMAIL_STATUSES = ["pending", "failed"] as const;

export const ALERT_SEVERITY_LABELS = {
  critical: "Критично",
  warning: "Предупреждение",
} as const;

export const ALERT_SEVERITY_ORDER = { critical: 0, warning: 1 } as const;

export const RESOLVED_SUBJECT_PREFIX = "[Решено]";
export const TEST_EMAIL_SUBJECT = "Тестовое письмо от админки";

export const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
