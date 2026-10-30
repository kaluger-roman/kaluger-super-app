import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { clearTestMailbox, findLatestMailFor } from "../../../lib/testMailbox";
import { AdminEmailSendError } from "../../../utils";
import { generateAdminToken, generateToken } from "../../../utils/auth";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import * as adminAlertsService from "../../../services/adminAlerts";
import * as emailModule from "../../../services/email";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

const ADDRESS = "alerts-settings-api@example.com";

describe("admin settings API", () => {
  let releaseLock: () => Promise<void>;
  const adminToken = generateAdminToken({ email: "admin@test.com", isAdmin: true });
  const tutorToken = generateToken({ userId: "tutor", email: "tutor@test.com" });

  const getSettings = () =>
    request(app).get("/api/admin/settings").set("Authorization", `Bearer ${adminToken}`);
  const putSettings = (body: unknown) =>
    request(app)
      .put("/api/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(body as object);
  const sendTestEmail = () =>
    request(app)
      .post("/api/admin/settings/test-email")
      .set("Authorization", `Bearer ${adminToken}`);

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminSettings.deleteMany();
    clearTestMailbox();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  describe("auth", () => {
    it.each([
      ["get", "/api/admin/settings"],
      ["put", "/api/admin/settings"],
      ["post", "/api/admin/settings/test-email"],
    ] as const)("should return 401 for %s %s without a token", async (method, url) => {
      await request(app)[method](url).expect(401);
    });

    it.each([
      ["get", "/api/admin/settings"],
      ["put", "/api/admin/settings"],
      ["post", "/api/admin/settings/test-email"],
    ] as const)("should return 403 for %s %s with a tutor token", async (method, url) => {
      await request(app)[method](url).set("Authorization", `Bearer ${tutorToken}`).expect(403);
    });
  });

  describe("GET /api/admin/settings", () => {
    it("should return the defaults", async () => {
      const res = await getSettings().expect(200);

      expect(res.body).toEqual({ alertEmail: null, alertEmailEnabled: true });
    });

    it("should answer 500 when reading fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(adminAlertsService, "getAdminSettings").mockRejectedValue(new Error("db down"));

      const res = await getSettings().expect(500);

      expect(res.body.error).toBe("Ошибка получения настроек");
    });
  });

  describe("PUT /api/admin/settings", () => {
    it("should save a trimmed address and the switch", async () => {
      const res = await putSettings({
        alertEmail: `  ${ADDRESS} `,
        alertEmailEnabled: false,
      }).expect(200);

      expect(res.body).toEqual({ alertEmail: ADDRESS, alertEmailEnabled: false });
      expect((await getSettings().expect(200)).body).toEqual(res.body);
    });

    it.each([
      ["an address without a domain zone", "admin@example"],
      ["a number", 42],
      ["an address longer than 254 characters", `${"a".repeat(245)}@example.com`],
    ])("should reject %s and keep the saved settings", async (_name, alertEmail) => {
      await putSettings({ alertEmail: ADDRESS, alertEmailEnabled: true }).expect(200);

      const res = await putSettings({ alertEmail, alertEmailEnabled: true }).expect(400);

      expect(res.body.error).toBe("Некорректный email");
      expect((await getSettings()).body.alertEmail).toBe(ADDRESS);
    });

    it.each([
      ["missing", undefined],
      ["a string", "true"],
    ])("should reject a %s switch", async (_name, alertEmailEnabled) => {
      const res = await putSettings({ alertEmail: ADDRESS, alertEmailEnabled }).expect(400);

      expect(res.body.error).toBe("Некорректное значение переключателя рассылки");
    });

    it.each([
      ["an empty string", ""],
      ["null", null],
    ])("should clear the saved address with %s", async (_name, alertEmail) => {
      await putSettings({ alertEmail: ADDRESS, alertEmailEnabled: true }).expect(200);

      const res = await putSettings({ alertEmail, alertEmailEnabled: true }).expect(200);

      expect(res.body.alertEmail).toBeNull();
      expect((await getSettings()).body.alertEmail).toBeNull();
    });

    it("should answer 500 when saving fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(adminAlertsService, "updateAdminSettings").mockRejectedValue(new Error("db down"));

      const res = await putSettings({ alertEmail: ADDRESS, alertEmailEnabled: true }).expect(500);

      expect(res.body.error).toBe("Ошибка сохранения настроек");
    });
  });

  describe("POST /api/admin/settings/test-email", () => {
    it("should send the test letter to the saved address", async () => {
      await putSettings({ alertEmail: ADDRESS, alertEmailEnabled: true }).expect(200);

      const res = await sendTestEmail().expect(200);

      expect(res.body).toEqual({ sentTo: ADDRESS });
      expect(findLatestMailFor(ADDRESS)?.subject).toBe("Тестовое письмо от админки");
    });

    it("should ask to save an address first", async () => {
      const res = await sendTestEmail().expect(400);

      expect(res.body.error).toBe("Сначала сохраните адрес для уведомлений");
    });

    it("should limit test letters to one a minute", async () => {
      await putSettings({ alertEmail: ADDRESS, alertEmailEnabled: true }).expect(200);
      await sendTestEmail().expect(200);

      const res = await sendTestEmail().expect(429);

      expect(res.body.error).toBe("Тестовое письмо можно отправлять не чаще раза в минуту");
    });

    it("should show the Resend error text", async () => {
      await putSettings({ alertEmail: ADDRESS, alertEmailEnabled: true }).expect(200);
      jest
        .spyOn(emailModule, "sendAdminEmail")
        .mockRejectedValue(new AdminEmailSendError("Invalid API key"));

      const res = await sendTestEmail().expect(502);

      expect(res.body.error).toBe("Не удалось отправить письмо: Invalid API key");
    });

    it("should answer 500 on an unexpected failure", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      jest.spyOn(adminAlertsService, "sendTestEmail").mockRejectedValue(new Error("boom"));

      const res = await sendTestEmail().expect(500);

      expect(res.body.error).toBe("Ошибка отправки тестового письма");
    });
  });
});
