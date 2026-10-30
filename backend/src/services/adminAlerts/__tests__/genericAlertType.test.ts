import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { clearTestMailbox, findLatestMailFor } from "../../../lib/testMailbox";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import { generateAdminToken } from "../../../utils/auth";
import * as emailModule from "../../email";
import type { AdminAlertDefinition } from "../adminAlerts.types";
import { updateAdminSettings } from "../adminSettings";
import { runAlertChecks } from "../runAlertChecks";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

const ADDRESS = "alerts-generic@example.com";

describe("a new alert type through the generic mechanism", () => {
  let releaseLock: () => Promise<void>;
  let conditionHolds = false;

  const definition: AdminAlertDefinition = {
    type: "test_custom",
    severity: "warning",
    title: "Не доходят пуш-напоминания",
    check: async () =>
      conditionHolds
        ? { active: true, description: "3 ошибки отправки за час" }
        : { active: false },
  };

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
    clearTestMailbox();
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  it("should open, repeat silently, resolve and show up in the admin API", async () => {
    const sendSpy = jest.spyOn(emailModule, "sendAdminEmail");

    conditionHolds = true;
    await runAlertChecks([definition], new Date());
    expect(findLatestMailFor(ADDRESS)?.subject).toBe("[Предупреждение] Не доходят пуш-напоминания");

    await runAlertChecks([definition], new Date());
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const adminToken = generateAdminToken({ email: "admin@test.com", isAdmin: true });
    const active = await request(app)
      .get("/api/admin/alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(active.body.alerts).toEqual([
      expect.objectContaining({
        type: "test_custom",
        severity: "warning",
        title: "Не доходят пуш-напоминания",
        description: "3 ошибки отправки за час",
        resolvedAt: null,
        openEmail: { status: "sent", attempts: 1, lastError: null },
      }),
    ]);

    conditionHolds = false;
    await runAlertChecks([definition], new Date());
    expect(findLatestMailFor(ADDRESS)?.subject).toBe("[Решено] Не доходят пуш-напоминания");
    expect(sendSpy).toHaveBeenCalledTimes(2);

    const resolved = await request(app)
      .get("/api/admin/alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(resolved.body.alerts[0]).toMatchObject({
      type: "test_custom",
      resolvedAt: expect.any(String),
      resolveEmail: { status: "sent", attempts: 1, lastError: null },
    });
  });
});
