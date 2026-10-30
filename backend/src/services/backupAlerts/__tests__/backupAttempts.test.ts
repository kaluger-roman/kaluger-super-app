import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "../../../lib/prisma";
import { clearTestMailbox, findLatestMailFor } from "../../../lib/testMailbox";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
  waitFor,
} from "../../../__tests__/helpers";
import { EmailSendError } from "../../../utils";
import * as adminAlertsModule from "../../adminAlerts";
import * as emailModule from "../../email";
import { createManualBackupWithAlerts, runBackupJobWithAlerts } from "../backupAttempts";

const mockExec = jest.fn();
jest.mock("child_process", () => ({
  exec: (...args: unknown[]) => mockExec(...args),
}));
jest.mock("../diskSpace", () => ({
  getDiskSpace: jest.fn(async () => ({ freeBytes: 50 * 1024 ** 3, totalBytes: 100 * 1024 ** 3 })),
}));

const ADDRESS = "alerts-backup-attempts@example.com";

type ExecCallback = (err: unknown, result: unknown) => void;

const failDump = (stderr: string) =>
  mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: ExecCallback) => {
    cb(Object.assign(new Error("exit 1"), { stderr }), { stdout: "", stderr });
  });

const succeedDump = () =>
  mockExec.mockImplementation((cmd: string, _opts: unknown, cb: ExecCallback) => {
    const match = cmd.match(/> "(.+)"/);
    if (match) fs.writeFileSync(match[1], Buffer.alloc(1024));
    cb(null, { stdout: "", stderr: "" });
  });

const findBackupFailed = () =>
  prisma.adminAlert.findUnique({ where: { activeType: "backup_failed" } });

describe("backup attempts with alerts", () => {
  let releaseBackupSettingsLock: () => Promise<void>;
  let releaseAdminAlertsLock: () => Promise<void>;
  let tmpDir: string;
  const originalBackupDir = process.env.BACKUP_DIR;

  beforeAll(async () => {
    releaseBackupSettingsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.BACKUP_SETTINGS);
    releaseAdminAlertsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-attempts-test-"));
    process.env.BACKUP_DIR = tmpDir;
    mockExec.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await prisma.backupSettings.deleteMany();
    await prisma.backupSettings.create({
      data: { id: "backup-settings-singleton", enabled: true, intervalHours: 6, maxStorageMb: 300 },
    });
    await adminAlertsModule.updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
    clearTestMailbox();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("should open backup_failed and send the letter right after a failed backup", async () => {
    failDump("connection refused");

    await expect(runBackupJobWithAlerts()).rejects.toThrow("Ошибка pg_dump: connection refused");

    const alert = await findBackupFailed();
    expect(alert).toMatchObject({
      severity: "critical",
      title: "Бэкап не создан",
      description: "Ошибка pg_dump: connection refused",
      openEmailStatus: "sent",
    });
    const mail = findLatestMailFor(ADDRESS);
    expect(mail?.subject).toBe("[Критично] Бэкап не создан");
    expect(mail?.html).toContain("connection refused");
  });

  it("should count a repeated failure without a second letter", async () => {
    failDump("connection refused");
    await expect(runBackupJobWithAlerts()).rejects.toThrow();
    const first = await findBackupFailed();
    expect(first).not.toBeNull();
    const longAgo = new Date(0);
    await prisma.adminAlert.update({
      where: { id: first?.id },
      data: { lastSeenAt: longAgo },
    });
    const sendSpy = jest.spyOn(emailModule, "sendAdminEmail");

    await expect(runBackupJobWithAlerts()).rejects.toThrow();

    const second = await findBackupFailed();
    expect(second?.id).toBe(first?.id);
    expect(second?.occurrences).toBe(2);
    expect(second?.lastSeenAt.getTime()).toBeGreaterThan(longAgo.getTime());
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("should resolve backup_failed with a «[Решено]» letter after a successful backup", async () => {
    failDump("connection refused");
    await expect(runBackupJobWithAlerts()).rejects.toThrow();

    succeedDump();
    const outcome = await runBackupJobWithAlerts();

    expect(outcome.status).toBe("created");
    expect(await findBackupFailed()).toBeNull();
    const resolved = await prisma.adminAlert.findFirstOrThrow({ where: { type: "backup_failed" } });
    expect(resolved).toMatchObject({ resolveEmailStatus: "sent" });
    expect(findLatestMailFor(ADDRESS)?.subject).toBe("[Решено] Бэкап не создан");
  });

  it("should skip the letter when no address is saved", async () => {
    await adminAlertsModule.updateAdminSettings({ alertEmail: null, alertEmailEnabled: true });
    failDump("connection refused");

    await expect(runBackupJobWithAlerts()).rejects.toThrow();

    expect((await findBackupFailed())?.openEmailStatus).toBe("skipped_no_email");
    expect(findLatestMailFor(ADDRESS)).toBeUndefined();
  });

  it("should keep the alert with the Resend error when the letter fails", async () => {
    jest
      .spyOn(emailModule, "sendAdminEmail")
      .mockRejectedValue(new EmailSendError("Invalid API key"));
    failDump("connection refused");

    await expect(runBackupJobWithAlerts()).rejects.toThrow();

    expect(await findBackupFailed()).toMatchObject({
      openEmailStatus: "failed",
      openEmailAttempts: 1,
      openEmailError: "Invalid API key",
    });
  });

  it("should not put the database password into the alert or the letter", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const databaseUrl = "postgresql://app:Sup3rSecret@db.local:5432/tutor_app?schema=public";
    process.env.DATABASE_URL = databaseUrl;
    try {
      failDump(`invalid connection option in "${databaseUrl}" (password Sup3rSecret)`);
      await expect(runBackupJobWithAlerts()).rejects.toThrow();
    } finally {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    expect((await findBackupFailed())?.description).not.toContain("Sup3rSecret");
    expect(findLatestMailFor(ADDRESS)?.html).not.toContain("Sup3rSecret");
  });

  it("should cut a pg_dump error over 1000 characters", async () => {
    failDump("x".repeat(3000));

    await expect(runBackupJobWithAlerts()).rejects.toThrow();

    expect((await findBackupFailed())?.description).toHaveLength(1000);
  });

  it("should change nothing on a skipped tick", async () => {
    await prisma.backupSettings.update({
      where: { id: "backup-settings-singleton" },
      data: { enabled: false },
    });

    await expect(runBackupJobWithAlerts()).resolves.toEqual({ status: "skipped" });

    expect(mockExec).not.toHaveBeenCalled();
    expect(await prisma.adminAlert.count()).toBe(0);
  });

  it("should rethrow the backup error when the alert bookkeeping fails", async () => {
    jest.spyOn(adminAlertsModule, "raiseAlert").mockRejectedValue(new Error("db is down"));
    failDump("connection refused");

    await expect(runBackupJobWithAlerts()).rejects.toThrow("Ошибка pg_dump: connection refused");

    expect(console.error).toHaveBeenCalledWith("Backup failure alert failed:", {
      message: "db is down",
    });
  });

  it("should raise and resolve backup_failed for manual backups too", async () => {
    failDump("connection refused");
    await expect(createManualBackupWithAlerts()).rejects.toThrow();
    expect(await findBackupFailed()).not.toBeNull();

    succeedDump();
    const result = await createManualBackupWithAlerts();

    expect(result.name).toMatch(/^backup-.+\.sql\.gz$/);
    expect(await findBackupFailed()).toBeNull();
    await adminAlertsModule.dispatchAlertEmails();
    expect(findLatestMailFor(ADDRESS)?.subject).toBe("[Решено] Бэкап не создан");
  });

  it("should answer a manual backup before the alert letter is sent", async () => {
    let finishSend: () => void = () => undefined;
    const sendSpy = jest.spyOn(emailModule, "sendAdminEmail").mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSend = resolve;
        })
    );
    failDump("connection refused");

    await expect(createManualBackupWithAlerts()).rejects.toThrow();

    expect(await findBackupFailed()).not.toBeNull();
    await waitFor(() => sendSpy.mock.calls.length === 1);
    finishSend();
    await adminAlertsModule.dispatchAlertEmails();
    expect((await findBackupFailed())?.openEmailStatus).toBe("sent");
  });
});
