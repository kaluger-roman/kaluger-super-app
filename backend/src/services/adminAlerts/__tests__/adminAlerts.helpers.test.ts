import type { AdminAlert } from "@prisma/client";
import {
  buildAlertEmail,
  buildTestEmail,
  compareAlerts,
  escapeHtml,
  formatMoscowDateTime,
  getEmailState,
  getNextOccurrences,
  getOpenEmailStatus,
  getResolveEmailStatus,
  getRetentionCutoff,
  getRetryableEmailWhere,
  isSkippedEmailStatus,
  toAlertDto,
  toEmailUpdate,
  truncateText,
  isOpenLetterDue,
  isResolveLetterDue,
} from "../adminAlerts.helpers";

const ADMIN_URL = "https://tutor.example.com/admin";

const makeAlert = (overrides: Partial<AdminAlert> = {}): AdminAlert => ({
  id: "alert-1",
  type: "backup_failed",
  activeType: "backup_failed",
  severity: "critical",
  title: "Бэкап не создан",
  description: "Ошибка: Ошибка pg_dump: connection refused",
  eventKey: null,
  openedAt: new Date("2026-10-29T08:00:01.000Z"),
  lastSeenAt: new Date("2026-10-29T09:00:02.000Z"),
  occurrences: 1,
  resolvedAt: null,
  readAt: null,
  openEmailStatus: "sent",
  openEmailAttempts: 1,
  openEmailError: null,
  resolveEmailStatus: null,
  resolveEmailAttempts: 0,
  resolveEmailError: null,
  ...overrides,
});

describe("adminAlerts.helpers", () => {
  describe("truncateText", () => {
    it("should keep text up to the limit untouched", () => {
      const text = "a".repeat(1000);
      expect(truncateText(text, 1000)).toBe(text);
    });

    it("should cut text over the limit to exactly the limit with an ellipsis", () => {
      const result = truncateText("a".repeat(1001), 1000);
      expect(result).toHaveLength(1000);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("getOpenEmailStatus", () => {
    it("should skip the letter when no address is saved", () => {
      expect(getOpenEmailStatus({ alertEmail: null, alertEmailEnabled: true })).toBe(
        "skipped_no_email"
      );
    });

    it("should prefer the missing address over the switched-off mailing", () => {
      expect(getOpenEmailStatus({ alertEmail: null, alertEmailEnabled: false })).toBe(
        "skipped_no_email"
      );
    });

    it("should skip the letter when mailing is switched off", () => {
      expect(getOpenEmailStatus({ alertEmail: "a@b.ru", alertEmailEnabled: false })).toBe(
        "skipped_disabled"
      );
    });

    it("should queue the letter when the address is saved and mailing is on", () => {
      expect(getOpenEmailStatus({ alertEmail: "a@b.ru", alertEmailEnabled: true })).toBe("pending");
    });
  });

  describe("getResolveEmailStatus", () => {
    it.each(["skipped_no_email", "skipped_disabled"] as const)(
      "should mirror a %s open letter",
      (status) => {
        expect(getResolveEmailStatus(status)).toBe(status);
      }
    );

    it.each(["pending", "sent", "failed"] as const)(
      "should queue the resolve letter after a %s open letter",
      (status) => {
        expect(getResolveEmailStatus(status)).toBe("pending");
      }
    );
  });

  describe("isSkippedEmailStatus", () => {
    it("should recognise only the skipped statuses", () => {
      expect(isSkippedEmailStatus("skipped_no_email")).toBe(true);
      expect(isSkippedEmailStatus("skipped_disabled")).toBe(true);
      expect(isSkippedEmailStatus("failed")).toBe(false);
      expect(isSkippedEmailStatus(null)).toBe(false);
    });
  });

  describe("letter readiness", () => {
    const letters = (
      open: [AdminAlert["openEmailStatus"], number],
      resolve: [AdminAlert["resolveEmailStatus"], number]
    ) => ({
      openEmailStatus: open[0],
      openEmailAttempts: open[1],
      resolveEmailStatus: resolve[0],
      resolveEmailAttempts: resolve[1],
    });

    it("should consider an open letter due while it can still be retried", () => {
      expect(isOpenLetterDue(letters(["pending", 0], [null, 0]))).toBe(true);
      expect(isOpenLetterDue(letters(["failed", 4], [null, 0]))).toBe(true);
      expect(isOpenLetterDue(letters(["failed", 5], [null, 0]))).toBe(false);
      expect(isOpenLetterDue(letters(["sent", 1], [null, 0]))).toBe(false);
    });

    it("should hold the resolve letter until the open letter is done", () => {
      expect(isResolveLetterDue(letters(["failed", 2], ["pending", 0]))).toBe(false);
      expect(isResolveLetterDue(letters(["sent", 1], ["pending", 0]))).toBe(true);
      expect(isResolveLetterDue(letters(["skipped_no_email", 0], ["pending", 0]))).toBe(true);
      expect(isResolveLetterDue(letters(["pending", 5], ["failed", 1]))).toBe(true);
    });

    it("should not consider a missing, sent or exhausted resolve letter due", () => {
      expect(isResolveLetterDue(letters(["sent", 1], [null, 0]))).toBe(false);
      expect(isResolveLetterDue(letters(["sent", 1], ["sent", 1]))).toBe(false);
      expect(isResolveLetterDue(letters(["sent", 1], ["failed", 5]))).toBe(false);
    });
  });

  describe("getNextOccurrences", () => {
    it("should keep the count without an event key", () => {
      expect(getNextOccurrences({ occurrences: 3, eventKey: "k1" }, undefined)).toBe(3);
    });

    it("should keep the count for the same event key", () => {
      expect(getNextOccurrences({ occurrences: 3, eventKey: "k1" }, "k1")).toBe(3);
    });

    it("should count a new event key", () => {
      expect(getNextOccurrences({ occurrences: 3, eventKey: "k1" }, "k2")).toBe(4);
      expect(getNextOccurrences({ occurrences: 1, eventKey: null }, "k1")).toBe(2);
    });
  });

  describe("compareAlerts", () => {
    it("should order active before resolved, critical before warning, newest first", () => {
      const oldCritical = makeAlert({
        id: "old-critical",
        openedAt: new Date("2026-10-01T00:00:00Z"),
      });
      const newCritical = makeAlert({
        id: "new-critical",
        openedAt: new Date("2026-10-20T00:00:00Z"),
      });
      const newestWarning = makeAlert({
        id: "warning",
        severity: "warning",
        openedAt: new Date("2026-10-28T00:00:00Z"),
      });
      const resolvedEarly = makeAlert({
        id: "resolved-early",
        resolvedAt: new Date("2026-10-02T00:00:00Z"),
      });
      const resolvedLate = makeAlert({
        id: "resolved-late",
        severity: "warning",
        resolvedAt: new Date("2026-10-25T00:00:00Z"),
      });

      const sorted = [resolvedEarly, newestWarning, oldCritical, resolvedLate, newCritical].sort(
        compareAlerts
      );

      expect(sorted.map(({ id }) => id)).toEqual([
        "new-critical",
        "old-critical",
        "warning",
        "resolved-late",
        "resolved-early",
      ]);
    });
  });

  describe("getRetentionCutoff", () => {
    it("should go back the given number of days", () => {
      expect(getRetentionCutoff(new Date("2026-10-29T00:00:00Z"), 90)).toEqual(
        new Date("2026-07-31T00:00:00Z")
      );
    });
  });

  describe("email state helpers", () => {
    it("should read the state of each letter", () => {
      const alert = makeAlert({ resolveEmailStatus: "failed", resolveEmailAttempts: 2 });
      expect(getEmailState(alert, "open")).toEqual({ status: "sent", attempts: 1 });
      expect(getEmailState(alert, "resolve")).toEqual({ status: "failed", attempts: 2 });
    });

    it("should build the claim condition of each letter", () => {
      expect(getRetryableEmailWhere("a", "open", 2)).toEqual({
        id: "a",
        openEmailStatus: { in: ["pending", "failed"] },
        openEmailAttempts: 2,
      });
      expect(getRetryableEmailWhere("a", "resolve")).toEqual({
        id: "a",
        resolveEmailStatus: { in: ["pending", "failed"] },
        resolveEmailAttempts: undefined,
      });
    });

    it("should build the update of each letter", () => {
      expect(toEmailUpdate("open", { status: "sent", error: null })).toEqual({
        openEmailStatus: "sent",
        openEmailAttempts: undefined,
        openEmailError: null,
      });
      expect(toEmailUpdate("resolve", { attempts: 3 })).toEqual({
        resolveEmailStatus: undefined,
        resolveEmailAttempts: 3,
        resolveEmailError: undefined,
      });
    });
  });

  describe("toAlertDto", () => {
    it("should map an active alert with ISO times and no resolve letter", () => {
      expect(toAlertDto(makeAlert({ occurrences: 2 }))).toEqual({
        id: "alert-1",
        type: "backup_failed",
        severity: "critical",
        title: "Бэкап не создан",
        description: "Ошибка: Ошибка pg_dump: connection refused",
        openedAt: "2026-10-29T08:00:01.000Z",
        lastSeenAt: "2026-10-29T09:00:02.000Z",
        occurrences: 2,
        resolvedAt: null,
        readAt: null,
        openEmail: { status: "sent", attempts: 1, lastError: null },
        resolveEmail: null,
      });
    });

    it("should include the resolve letter of a resolved alert", () => {
      const dto = toAlertDto(
        makeAlert({
          activeType: null,
          resolvedAt: new Date("2026-10-29T10:00:00.000Z"),
          readAt: new Date("2026-10-29T09:30:00.000Z"),
          resolveEmailStatus: "failed",
          resolveEmailAttempts: 5,
          resolveEmailError: "Invalid API key",
        })
      );

      expect(dto.resolvedAt).toBe("2026-10-29T10:00:00.000Z");
      expect(dto.readAt).toBe("2026-10-29T09:30:00.000Z");
      expect(dto.resolveEmail).toEqual({
        status: "failed",
        attempts: 5,
        lastError: "Invalid API key",
      });
    });
  });

  describe("escapeHtml", () => {
    it("should escape markup characters", () => {
      expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
        "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;"
      );
    });
  });

  describe("formatMoscowDateTime", () => {
    it("should render UTC time in Moscow time", () => {
      expect(formatMoscowDateTime(new Date("2026-10-29T21:05:00.000Z"))).toBe(
        "30.10.2026 00:05 (МСК)"
      );
    });
  });

  describe("buildAlertEmail", () => {
    it("should prefix an open critical letter with [Критично]", () => {
      const { subject, html } = buildAlertEmail(makeAlert(), "open", ADMIN_URL);

      expect(subject).toBe("[Критично] Бэкап не создан");
      expect(html).toContain("Уровень: Критично");
      expect(html).toContain("Началось: 29.10.2026 11:00 (МСК)");
      expect(html).not.toContain("Закрыто");
      expect(html).toContain(`href="${ADMIN_URL}"`);
      expect(html).toContain("Открыть админку");
      expect(html).toContain("white-space: pre-wrap");
    });

    it("should prefix an open warning letter with [Предупреждение]", () => {
      const { subject, html } = buildAlertEmail(
        makeAlert({ severity: "warning", title: "Автобэкапы выключены" }),
        "open",
        ADMIN_URL
      );

      expect(subject).toBe("[Предупреждение] Автобэкапы выключены");
      expect(html).toContain("Уровень: Предупреждение");
    });

    it("should mark a resolve letter [Решено] with the close time", () => {
      const { subject, html } = buildAlertEmail(
        makeAlert({ resolvedAt: new Date("2026-10-29T12:30:00.000Z") }),
        "resolve",
        ADMIN_URL
      );

      expect(subject).toBe("[Решено] Бэкап не создан");
      expect(html).toContain("Проблема решена");
      expect(html).toContain("Закрыто: 29.10.2026 15:30 (МСК)");
    });

    it("should escape the description", () => {
      const { html } = buildAlertEmail(
        makeAlert({ description: "<script>alert(1)</script>" }),
        "open",
        ADMIN_URL
      );

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
  });

  describe("buildTestEmail", () => {
    it("should build the test letter with the admin link", () => {
      const { subject, html } = buildTestEmail(ADMIN_URL);

      expect(subject).toBe("Тестовое письмо от админки");
      expect(html).toContain("уведомления об алертах будут приходить на этот адрес");
      expect(html).toContain(`href="${ADMIN_URL}"`);
    });
  });
});
