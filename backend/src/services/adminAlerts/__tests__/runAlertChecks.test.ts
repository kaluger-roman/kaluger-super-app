import { prisma } from "../../../lib/prisma";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import type { AdminAlertDefinition, AlertCheckContext } from "../adminAlerts.types";
import { findActiveAlert, raiseAlert } from "../alertLifecycle";
import { runAlertChecks } from "../runAlertChecks";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("runAlertChecks", () => {
  let releaseLock: () => Promise<void>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  it("should log a throwing check and still run the next one", async () => {
    const broken: AdminAlertDefinition = {
      type: "test_runner_broken",
      severity: "critical",
      title: "Сломанная проверка",
      check: async () => {
        throw new Error("disk is gone");
      },
    };
    const healthy: AdminAlertDefinition = {
      type: "test_runner_healthy",
      severity: "warning",
      title: "Рабочая проверка",
      check: async () => ({ active: true, description: "есть проблема" }),
    };

    await runAlertChecks([broken, healthy], NOW);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Alert check failed:", {
      type: "test_runner_broken",
      message: "disk is gone",
    });
    expect(await findActiveAlert(broken.type)).toBeNull();
    expect(await findActiveAlert(healthy.type)).not.toBeNull();
  });

  it("should keep an active alert when the check has no data", async () => {
    const definition: AdminAlertDefinition = {
      type: "test_runner_no_data",
      severity: "warning",
      title: "Нет данных",
      check: async () => null,
    };
    await raiseAlert(definition, { description: "было" }, NOW);

    await runAlertChecks([definition], NOW);

    expect((await findActiveAlert(definition.type))?.description).toBe("было");
  });

  it("should pass the run time and the active alert to the check", async () => {
    const contexts: AlertCheckContext[] = [];
    const definition: AdminAlertDefinition = {
      type: "test_runner_context",
      severity: "warning",
      title: "Контекст",
      check: async (context) => {
        contexts.push(context);
        return { active: true, description: "x" };
      },
    };

    await runAlertChecks([definition], NOW);
    await runAlertChecks([definition], NOW);

    expect(contexts[0]).toEqual({ now: NOW, activeAlert: null });
    expect(contexts[1].activeAlert?.type).toBe(definition.type);
  });

  it("should skip event-only definitions without a check", async () => {
    const eventOnly: AdminAlertDefinition = {
      type: "test_runner_event_only",
      severity: "critical",
      title: "Только событие",
    };
    await raiseAlert(eventOnly, { description: "x" }, NOW);

    await runAlertChecks([eventOnly], NOW);

    expect(await findActiveAlert(eventOnly.type)).not.toBeNull();
  });

  it("should delete alerts resolved more than 90 days ago", async () => {
    await prisma.adminAlert.create({
      data: {
        type: "test_runner_expired",
        severity: "warning",
        title: "Старый",
        description: "x",
        openEmailStatus: "sent",
        resolvedAt: new Date(NOW.getTime() - 91 * DAY_MS),
      },
    });

    await runAlertChecks([], NOW);

    expect(await prisma.adminAlert.count()).toBe(0);
  });
});
