import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { app } from "../index";
import { prisma } from "../lib/prisma";
import { sendTestEmail, updateAdminSettings } from "../services/adminAlerts";
import { acquireGlobalTestLock, GLOBAL_TEST_LOCK, GLOBAL_TEST_LOCK_TIMEOUT_MS } from "./helpers";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));
jest.mock("../services/backupAlerts/diskSpace", () => ({
  getDiskSpace: jest.fn(async () => ({ freeBytes: 50 * 1024 ** 3, totalBytes: 100 * 1024 ** 3 })),
}));

describe("test support: admin alerts", () => {
  let releaseBackupSettingsLock: () => Promise<void>;
  let releaseAdminAlertsLock: () => Promise<void>;
  let tmpDir: string;
  const originalBackupDir = process.env.BACKUP_DIR;

  beforeAll(async () => {
    releaseBackupSettingsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.BACKUP_SETTINGS);
    releaseAdminAlertsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-support-alerts-"));
    process.env.BACKUP_DIR = tmpDir;
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await prisma.backupSettings.deleteMany();
  });

  afterEach(() => {
    process.env.BACKUP_DIR = originalBackupDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await prisma.backupSettings.deleteMany();
    await releaseAdminAlertsLock();
    await releaseBackupSettingsLock();
  });

  it("should run only the requested checks", async () => {
    await request(app)
      .post("/api/__test__/admin/run-alert-checks")
      .send({ types: ["offsite_stale", "restore_check_stale"] })
      .expect(200, { ok: true });

    const types = (await prisma.adminAlert.findMany({ where: { resolvedAt: null } }))
      .map(({ type }) => type)
      .sort();
    expect(types).toEqual(["offsite_stale", "restore_check_stale"]);
  });

  it("should run every registered check without a type list", async () => {
    await request(app).post("/api/__test__/admin/run-alert-checks").expect(200, { ok: true });

    const types = (await prisma.adminAlert.findMany({ where: { resolvedAt: null } })).map(
      ({ type }) => type
    );
    expect(types).toEqual(expect.arrayContaining(["offsite_stale", "restore_check_stale"]));
  });

  it("should delete every alert and reset the settings", async () => {
    await updateAdminSettings({ alertEmail: "e2e-admin@example.com", alertEmailEnabled: false });
    await request(app)
      .post("/api/__test__/admin/run-alert-checks")
      .send({ types: ["offsite_stale"] })
      .expect(200);

    await request(app).delete("/api/__test__/admin/alerts").expect(200, { ok: true });

    expect(await prisma.adminAlert.count()).toBe(0);
    expect(await prisma.adminSettings.count()).toBe(0);
  });

  it("should lift the test letter limit so an e2e rerun can send it again", async () => {
    await updateAdminSettings({ alertEmail: "e2e-admin@example.com", alertEmailEnabled: true });
    await sendTestEmail();

    await request(app).delete("/api/__test__/admin/alerts").expect(200);
    await updateAdminSettings({ alertEmail: "e2e-admin@example.com", alertEmailEnabled: true });

    await expect(sendTestEmail()).resolves.toEqual({ sentTo: "e2e-admin@example.com" });
  });

  it("should remove the offsite storage report with the backup files", async () => {
    fs.writeFileSync(path.join(tmpDir, ".offsite-storage.json"), "{}");
    fs.writeFileSync(path.join(tmpDir, ".unrelated"), "keep");

    await request(app).delete("/api/__test__/backup/files").expect(204);

    expect(fs.readdirSync(tmpDir)).toEqual([".unrelated"]);
  });
});
