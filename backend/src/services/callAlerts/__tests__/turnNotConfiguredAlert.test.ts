import { prisma } from "../../../lib/prisma";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import { findActiveAlert, runAlertChecks } from "../../adminAlerts";
import { ALERT_DEFINITIONS } from "../../alertRegistry";
import { TURN_NOT_CONFIGURED_ALERT } from "../definitions";

const NOW = new Date("2026-10-30T12:00:00.000Z");

describe("turn_not_configured alert", () => {
  const originalEnv = { ...process.env };
  let releaseLock: () => Promise<void>;

  const setProdServer = () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
  };
  const setTurn = () => {
    process.env.TURN_URL = "turn:tutor.kaluger.ru:3478?transport=udp";
    process.env.TURN_SECRET = "secret123";
  };
  const clearTurn = () => {
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;
  };
  const check = () => TURN_NOT_CONFIGURED_ALERT.check!({ now: NOW, activeAlert: null });

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  it("should be registered for the scheduled checks", () => {
    expect(ALERT_DEFINITIONS).toContain(TURN_NOT_CONFIGURED_ALERT);
    expect(TURN_NOT_CONFIGURED_ALERT).toMatchObject({
      type: "turn_not_configured",
      severity: "warning",
      title: "TURN-релей для видеозвонков не настроен",
    });
  });

  it("should be active on a production server without TURN", async () => {
    setProdServer();
    clearTurn();

    const result = await check();

    expect(result).toEqual({ active: true, description: expect.any(String) });
    expect(result?.active && result.description).toMatch(/TURN_URL.*TURN_SECRET/);
    expect(result?.active && result.description).toContain("docs/ops/turn-relay.md");
  });

  it("should be inactive on a production server with TURN configured", async () => {
    setProdServer();
    setTurn();

    expect(await check()).toEqual({ active: false });
  });

  it.each(["development", "test"])("should be inactive in %s without TURN", async (nodeEnv) => {
    setProdServer();
    process.env.NODE_ENV = nodeEnv;
    clearTurn();

    expect(await check()).toEqual({ active: false });
  });

  it("should be inactive on the localhost QA stack without TURN", async () => {
    setProdServer();
    process.env.FRONTEND_URL = "http://localhost:3000";
    clearTurn();

    expect(await check()).toEqual({ active: false });
  });

  it("should open without TURN and close once TURN is configured", async () => {
    setProdServer();
    clearTurn();

    await runAlertChecks([TURN_NOT_CONFIGURED_ALERT], NOW);

    expect(await findActiveAlert("turn_not_configured")).toMatchObject({
      severity: "warning",
      title: "TURN-релей для видеозвонков не настроен",
    });

    setTurn();
    await runAlertChecks([TURN_NOT_CONFIGURED_ALERT], NOW);

    expect(await findActiveAlert("turn_not_configured")).toBeNull();
  });
});
