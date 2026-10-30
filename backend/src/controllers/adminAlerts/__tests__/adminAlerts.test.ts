import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateAdminToken, generateToken } from "../../../utils/auth";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import * as adminAlertsService from "../../../services/adminAlerts";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

const DAY_MS = 24 * 60 * 60 * 1000;

type AlertSeed = {
  type: string;
  severity?: "critical" | "warning";
  openedAt?: Date;
  resolvedAt?: Date | null;
  readAt?: Date | null;
};

const seedAlert = ({
  type,
  severity = "warning",
  openedAt,
  resolvedAt = null,
  readAt = null,
}: AlertSeed) =>
  prisma.adminAlert.create({
    data: {
      type,
      activeType: resolvedAt ? null : type,
      severity,
      title: `Алерт ${type}`,
      description: "Описание",
      openedAt: openedAt ?? new Date(),
      resolvedAt,
      readAt,
      openEmailStatus: "sent",
      openEmailAttempts: 1,
      resolveEmailStatus: resolvedAt ? "sent" : null,
      resolveEmailAttempts: resolvedAt ? 1 : 0,
    },
  });

describe("admin alerts API", () => {
  let releaseLock: () => Promise<void>;
  const adminToken = generateAdminToken({ email: "admin@test.com", isAdmin: true });
  const tutorToken = generateToken({ userId: "tutor", email: "tutor@test.com" });

  const get = () =>
    request(app).get("/api/admin/alerts").set("Authorization", `Bearer ${adminToken}`);
  const post = (url: string) => request(app).post(url).set("Authorization", `Bearer ${adminToken}`);

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminAlert.deleteMany();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.adminAlert.deleteMany();
    await releaseLock();
  });

  describe("GET /api/admin/alerts", () => {
    it("should return 401 without a token", async () => {
      await request(app).get("/api/admin/alerts").expect(401);
    });

    it("should return 403 with a tutor token", async () => {
      await request(app)
        .get("/api/admin/alerts")
        .set("Authorization", `Bearer ${tutorToken}`)
        .expect(403);
    });

    it("should list active alerts first and resolved ones from the last 90 days", async () => {
      const now = Date.now();
      await seedAlert({ type: "warning_new", openedAt: new Date(now - 1000) });
      await seedAlert({
        type: "critical_old",
        severity: "critical",
        openedAt: new Date(now - DAY_MS),
      });
      await seedAlert({ type: "resolved_recent", resolvedAt: new Date(now - 10 * DAY_MS) });
      await seedAlert({ type: "resolved_old", resolvedAt: new Date(now - 100 * DAY_MS) });

      const res = await get().expect(200);

      expect(res.body.alerts.map((alert: { type: string }) => alert.type)).toEqual([
        "critical_old",
        "warning_new",
        "resolved_recent",
      ]);
      expect(res.body.alerts[0]).toMatchObject({
        severity: "critical",
        title: "Алерт critical_old",
        occurrences: 1,
        resolvedAt: null,
        readAt: null,
        openEmail: { status: "sent", attempts: 1, lastError: null },
        resolveEmail: null,
      });
      expect(res.body.alerts[2].resolveEmail).toEqual({
        status: "sent",
        attempts: 1,
        lastError: null,
      });
    });

    it("should answer 500 when listing fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(adminAlertsService, "listAlerts").mockRejectedValue(new Error("db down"));

      const res = await get().expect(500);

      expect(res.body.error).toBe("Ошибка получения алертов");
    });
  });

  describe("POST /api/admin/alerts/:id/read", () => {
    it("should mark an active alert read and return the list", async () => {
      const alert = await seedAlert({ type: "unread" });

      const res = await post(`/api/admin/alerts/${alert.id}/read`).expect(200);

      expect(res.body.alerts[0].readAt).toEqual(expect.any(String));
    });

    it("should leave a resolved alert unchanged", async () => {
      const alert = await seedAlert({ type: "resolved", resolvedAt: new Date() });

      const res = await post(`/api/admin/alerts/${alert.id}/read`).expect(200);

      expect(res.body.alerts[0].readAt).toBeNull();
    });

    it("should return 404 for an unknown alert", async () => {
      const res = await post("/api/admin/alerts/missing-id/read").expect(404);

      expect(res.body.error).toBe("Алерт не найден");
    });

    it("should return 401 without a token", async () => {
      await request(app).post("/api/admin/alerts/any/read").expect(401);
    });

    it("should answer 500 when the update fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(adminAlertsService, "markAlertRead").mockRejectedValue(new Error("db down"));

      const res = await post("/api/admin/alerts/any/read").expect(500);

      expect(res.body.error).toBe("Ошибка обновления алерта");
    });
  });

  describe("POST /api/admin/alerts/read-all", () => {
    it("should mark only active unread alerts", async () => {
      const readAt = new Date(Date.now() - DAY_MS);
      await seedAlert({ type: "unread_one" });
      await seedAlert({ type: "unread_two", severity: "critical" });
      await seedAlert({ type: "already_read", readAt });
      await seedAlert({ type: "resolved", resolvedAt: new Date() });

      const res = await post("/api/admin/alerts/read-all").expect(200);

      const byType = Object.fromEntries(
        res.body.alerts.map((alert: { type: string; readAt: string | null }) => [
          alert.type,
          alert.readAt,
        ])
      );
      expect(byType.unread_one).toEqual(expect.any(String));
      expect(byType.unread_two).toEqual(expect.any(String));
      expect(byType.already_read).toBe(readAt.toISOString());
      expect(byType.resolved).toBeNull();
    });

    it("should return 403 with a tutor token", async () => {
      await request(app)
        .post("/api/admin/alerts/read-all")
        .set("Authorization", `Bearer ${tutorToken}`)
        .expect(403);
    });

    it("should answer 500 when the update fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(adminAlertsService, "markAllAlertsRead").mockRejectedValue(new Error("db down"));

      const res = await post("/api/admin/alerts/read-all").expect(500);

      expect(res.body.error).toBe("Ошибка обновления алертов");
    });
  });
});
