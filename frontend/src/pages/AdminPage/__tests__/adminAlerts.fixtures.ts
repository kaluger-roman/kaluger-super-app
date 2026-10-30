import type { AdminAlert } from "@shared";

export const makeAlert = (overrides: Partial<AdminAlert> = {}): AdminAlert => ({
  id: "a1",
  type: "backup_failed",
  severity: "critical",
  title: "Бэкап не создан",
  description: "Ошибка pg_dump: connection refused",
  openedAt: "2026-10-20T03:00:00.000Z",
  lastSeenAt: "2026-10-20T03:00:00.000Z",
  occurrences: 1,
  resolvedAt: null,
  readAt: null,
  openEmail: { status: "sent", attempts: 1, lastError: null },
  resolveEmail: null,
  ...overrides,
});

export const READ_AT = "2026-10-20T08:12:00.000Z";

export const RESOLVED = {
  resolvedAt: "2026-10-20T21:10:00.000Z",
  resolveEmail: { status: "sent", attempts: 1, lastError: null },
} as const;
