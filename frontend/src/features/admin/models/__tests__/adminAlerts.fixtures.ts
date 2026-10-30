import type { AdminAlert } from "@shared";

export const makeAlert = (overrides: Partial<AdminAlert> = {}): AdminAlert => ({
  id: "a1",
  type: "backup_failed",
  severity: "critical",
  title: "Бэкап не создан",
  description: "Ошибка pg_dump: connection refused",
  openedAt: "2026-10-29T08:00:01.000Z",
  lastSeenAt: "2026-10-29T09:00:02.000Z",
  occurrences: 1,
  resolvedAt: null,
  readAt: null,
  openEmail: { status: "sent", attempts: 1, lastError: null },
  resolveEmail: null,
  ...overrides,
});

export const RESOLVED = {
  resolvedAt: "2026-10-29T10:00:00.000Z",
  resolveEmail: { status: "sent", attempts: 1, lastError: null },
} as const;

export const READ_AT = "2026-10-29T09:30:00.000Z";
