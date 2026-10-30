import { prisma } from "../../../lib/prisma";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import { AdminAlertNotFoundError } from "../../../utils";
import type { AdminAlertDefinition } from "../adminAlerts.types";
import {
  applyCheckResult,
  deleteExpiredAlerts,
  findActiveAlert,
  listAlerts,
  markAlertRead,
  markAllAlertsRead,
  raiseAlert,
  resolveAlert,
} from "../alertLifecycle";
import { updateAdminSettings } from "../adminSettings";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-29T12:00:00.000Z");

const CRITICAL: AdminAlertDefinition = {
  type: "test_lifecycle_critical",
  severity: "critical",
  title: "Тестовая критичная проблема",
};
const WARNING: AdminAlertDefinition = {
  type: "test_lifecycle_warning",
  severity: "warning",
  title: "Тестовое предупреждение",
};

const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

const setClock = (date: Date) => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(date);
};

describe("alertLifecycle", () => {
  let releaseLock: () => Promise<void>;

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  describe("raiseAlert", () => {
    it("should open an active alert with the definition's severity and title", async () => {
      const alert = await raiseAlert(CRITICAL, { description: "Что-то сломалось" }, NOW);

      expect(alert).toMatchObject({
        type: CRITICAL.type,
        activeType: CRITICAL.type,
        severity: "critical",
        title: CRITICAL.title,
        description: "Что-то сломалось",
        openedAt: NOW,
        lastSeenAt: NOW,
        occurrences: 1,
        resolvedAt: null,
        readAt: null,
        resolveEmailStatus: null,
      });
    });

    it("should skip the open letter when no address is saved", async () => {
      const alert = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      expect(alert.openEmailStatus).toBe("skipped_no_email");
    });

    it("should skip the open letter when mailing is switched off", async () => {
      await updateAdminSettings({ alertEmail: "admin@example.com", alertEmailEnabled: false });
      const alert = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      expect(alert.openEmailStatus).toBe("skipped_disabled");
    });

    it("should queue the open letter when the address is saved and mailing is on", async () => {
      await updateAdminSettings({ alertEmail: "admin@example.com", alertEmailEnabled: true });
      const alert = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      expect(alert.openEmailStatus).toBe("pending");
    });

    it("should refresh the active alert on a repeat and keep it read", async () => {
      const opened = await raiseAlert(CRITICAL, { description: "первый", eventKey: "k1" }, NOW);
      setClock(at(1000));
      await markAlertRead(opened.id);

      const repeated = await raiseAlert(
        CRITICAL,
        { description: "второй", eventKey: "k1" },
        at(60_000)
      );

      expect(repeated.id).toBe(opened.id);
      expect(repeated.description).toBe("второй");
      expect(repeated.lastSeenAt).toEqual(at(60_000));
      expect(repeated.openedAt).toEqual(NOW);
      expect(repeated.occurrences).toBe(1);
      expect(repeated.readAt).toEqual(at(1000));
    });

    it("should count only new event keys as occurrences", async () => {
      await raiseAlert(CRITICAL, { description: "x", eventKey: "k1" }, NOW);
      await raiseAlert(CRITICAL, { description: "x", eventKey: "k2" }, at(1000));
      await raiseAlert(CRITICAL, { description: "x" }, at(2000));
      const alert = await raiseAlert(CRITICAL, { description: "x", eventKey: "k2" }, at(3000));

      expect(alert.occurrences).toBe(2);
      expect(alert.eventKey).toBe("k2");
    });

    it("should keep exactly one active alert when two raises race", async () => {
      await Promise.all([
        raiseAlert(CRITICAL, { description: "a" }, NOW),
        raiseAlert(CRITICAL, { description: "b" }, NOW),
        raiseAlert(CRITICAL, { description: "c" }, NOW),
      ]);

      expect(await prisma.adminAlert.count({ where: { type: CRITICAL.type } })).toBe(1);
    });

    it("should truncate a description over 1000 characters", async () => {
      const alert = await raiseAlert(CRITICAL, { description: "e".repeat(5000) }, NOW);

      expect(alert.description).toHaveLength(1000);
      expect(alert.description.endsWith("…")).toBe(true);
    });
  });

  describe("resolveAlert", () => {
    it("should close the active alert and queue the resolve letter", async () => {
      await updateAdminSettings({ alertEmail: "admin@example.com", alertEmailEnabled: true });
      const opened = await raiseAlert(CRITICAL, { description: "x" }, NOW);

      await expect(resolveAlert(CRITICAL, at(1000))).resolves.toBe(true);

      const resolved = await prisma.adminAlert.findUniqueOrThrow({ where: { id: opened.id } });
      expect(resolved.activeType).toBeNull();
      expect(resolved.resolvedAt).toEqual(at(1000));
      expect(resolved.resolveEmailStatus).toBe("pending");
    });

    it("should mirror a skipped open letter on the resolve letter", async () => {
      const opened = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      await resolveAlert(CRITICAL, at(1000));

      const resolved = await prisma.adminAlert.findUniqueOrThrow({ where: { id: opened.id } });
      expect(resolved.resolveEmailStatus).toBe("skipped_no_email");
    });

    it("should do nothing when the type has no active alert", async () => {
      await expect(resolveAlert(CRITICAL, NOW)).resolves.toBe(false);
    });

    it("should open a new unread alert when the problem returns after resolve", async () => {
      const first = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      setClock(at(1));
      await markAlertRead(first.id);
      await resolveAlert(CRITICAL, at(2));

      const second = await raiseAlert(CRITICAL, { description: "снова" }, at(3));

      expect(second.id).not.toBe(first.id);
      expect(second.readAt).toBeNull();
      expect(second.occurrences).toBe(1);
      expect(await prisma.adminAlert.count({ where: { type: CRITICAL.type } })).toBe(2);
    });
  });

  describe("applyCheckResult", () => {
    it("should raise, keep and resolve by the check result", async () => {
      await applyCheckResult(WARNING, { active: true, description: "есть" }, NOW);
      expect(await findActiveAlert(WARNING.type)).not.toBeNull();

      await applyCheckResult(WARNING, null, at(1000));
      expect(await findActiveAlert(WARNING.type)).not.toBeNull();

      await applyCheckResult(WARNING, { active: false }, at(2000));
      expect(await findActiveAlert(WARNING.type)).toBeNull();
    });
  });

  describe("listAlerts", () => {
    it("should list active alerts first and resolved ones within 90 days", async () => {
      await raiseAlert(WARNING, { description: "w" }, at(-DAY_MS));
      await raiseAlert(CRITICAL, { description: "c" }, at(-2 * DAY_MS));
      const recent = await prisma.adminAlert.create({
        data: {
          type: "test_recent",
          severity: "warning",
          title: "Недавно закрытый",
          description: "r",
          openEmailStatus: "sent",
          resolveEmailStatus: "sent",
          resolvedAt: at(-89 * DAY_MS),
        },
      });
      await prisma.adminAlert.create({
        data: {
          type: "test_old",
          severity: "critical",
          title: "Давно закрытый",
          description: "o",
          openEmailStatus: "sent",
          resolveEmailStatus: "sent",
          resolvedAt: at(-91 * DAY_MS),
        },
      });

      setClock(NOW);
      const alerts = await listAlerts();

      expect(alerts.map(({ type }) => type)).toEqual([CRITICAL.type, WARNING.type, recent.type]);
      expect(alerts[0].resolveEmail).toBeNull();
      expect(alerts[2].resolveEmail).toEqual({ status: "sent", attempts: 0, lastError: null });
    });
  });

  describe("markAlertRead", () => {
    it("should mark an active unread alert read", async () => {
      const alert = await raiseAlert(CRITICAL, { description: "x" }, NOW);

      setClock(at(1000));

      await markAlertRead(alert.id);

      const stored = await prisma.adminAlert.findUniqueOrThrow({ where: { id: alert.id } });
      expect(stored.readAt).toEqual(at(1000));
    });

    it("should keep the first read time of an already read alert", async () => {
      const alert = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      setClock(at(1000));
      await markAlertRead(alert.id);

      setClock(at(2000));

      await markAlertRead(alert.id);

      const stored = await prisma.adminAlert.findUniqueOrThrow({ where: { id: alert.id } });
      expect(stored.readAt).toEqual(at(1000));
    });

    it("should leave a resolved alert unread", async () => {
      const alert = await raiseAlert(CRITICAL, { description: "x" }, NOW);
      await resolveAlert(CRITICAL, at(1000));

      setClock(at(2000));

      await markAlertRead(alert.id);

      const stored = await prisma.adminAlert.findUniqueOrThrow({ where: { id: alert.id } });
      expect(stored.readAt).toBeNull();
    });

    it("should throw for an unknown alert", async () => {
      await expect(markAlertRead("missing-id")).rejects.toBeInstanceOf(AdminAlertNotFoundError);
    });
  });

  describe("markAllAlertsRead", () => {
    it("should mark only active unread alerts", async () => {
      await raiseAlert(CRITICAL, { description: "c" }, NOW);
      const warning = await raiseAlert(WARNING, { description: "w" }, NOW);
      setClock(at(1));
      await markAlertRead(warning.id);
      const resolved = await prisma.adminAlert.create({
        data: {
          type: "test_resolved",
          severity: "warning",
          title: "Закрытый",
          description: "r",
          openEmailStatus: "sent",
          resolvedAt: at(-DAY_MS),
        },
      });

      setClock(at(1000));
      await expect(markAllAlertsRead()).resolves.toBe(1);

      expect((await findActiveAlert(CRITICAL.type))?.readAt).toEqual(at(1000));
      expect((await findActiveAlert(WARNING.type))?.readAt).toEqual(at(1));
      const stored = await prisma.adminAlert.findUniqueOrThrow({ where: { id: resolved.id } });
      expect(stored.readAt).toBeNull();
    });
  });

  describe("deleteExpiredAlerts", () => {
    it("should delete only alerts resolved more than 90 days ago", async () => {
      await raiseAlert(CRITICAL, { description: "active" }, at(-200 * DAY_MS));
      const base = {
        severity: "warning" as const,
        title: "Закрытый",
        description: "r",
        openEmailStatus: "sent" as const,
      };
      await prisma.adminAlert.create({
        data: { ...base, type: "test_fresh", resolvedAt: at(-89 * DAY_MS) },
      });
      await prisma.adminAlert.create({
        data: { ...base, type: "test_expired", resolvedAt: at(-91 * DAY_MS) },
      });

      await expect(deleteExpiredAlerts(NOW)).resolves.toBe(1);

      const types = (await prisma.adminAlert.findMany()).map(({ type }) => type).sort();
      expect(types).toEqual([CRITICAL.type, "test_fresh"].sort());
    });
  });
});
