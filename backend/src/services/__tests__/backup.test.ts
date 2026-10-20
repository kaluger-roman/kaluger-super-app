import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "../../lib/prisma";
import {
  getTotalSizeMb,
  cleanupOldBackups,
  getBackupSettings,
  performBackup,
  runBackupJob,
} from "../backup";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../__tests__/helpers";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

const mockExec = jest.fn();
jest.mock("child_process", () => ({
  exec: (...args: unknown[]) => mockExec(...args),
}));

describe("backup service", () => {
  let tmpDir: string;
  const originalEnv = process.env.BACKUP_DIR;
  let releaseBackupSettingsLock: () => Promise<void>;

  beforeAll(async () => {
    releaseBackupSettingsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.BACKUP_SETTINGS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-test-"));
    process.env.BACKUP_DIR = tmpDir;
    await prisma.backupSettings.deleteMany();
  });

  afterEach(() => {
    process.env.BACKUP_DIR = originalEnv;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await prisma.backupSettings.deleteMany();
    await releaseBackupSettingsLock();
  });

  describe("getTotalSizeMb", () => {
    it("should return 0 for empty array", () => {
      expect(getTotalSizeMb([])).toBe(0);
    });

    it("should sum sizes correctly", () => {
      const files = [{ sizeMb: 10 }, { sizeMb: 20.5 }, { sizeMb: 5 }];
      expect(getTotalSizeMb(files)).toBe(35.5);
    });
  });

  describe("getBackupSettings", () => {
    it("should create default settings when none exist", async () => {
      const settings = await getBackupSettings();

      expect(settings.enabled).toBe(true);
      expect(settings.intervalHours).toBe(6);
      expect(settings.maxStorageMb).toBe(300);
      expect(settings.lastBackupAt).toBeNull();
    });

    it("should return existing settings", async () => {
      await prisma.backupSettings.create({
        data: {
          id: "backup-settings-singleton",
          enabled: false,
          intervalHours: 12,
          maxStorageMb: 500,
        },
      });

      const settings = await getBackupSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.intervalHours).toBe(12);
      expect(settings.maxStorageMb).toBe(500);
    });

    it("should not create duplicate rows on concurrent first-time access (regression: findFirst+create race)", async () => {
      // Regression for bug-hunt 2026-05-09-3 #8: parallel callers used to both
      // see findFirst -> null and both call create, ending with two rows.
      // upsert with a fixed singleton id is race-safe.
      await Promise.all([getBackupSettings(), getBackupSettings(), getBackupSettings()]);

      const count = await prisma.backupSettings.count();
      expect(count).toBe(1);
    });
  });

  describe("cleanupOldBackups", () => {
    const oneMb = 1024 * 1024;
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date("2026-10-16T12:00:00.000Z");

    const writeBackup = (daysAgo: number, sizeBytes = oneMb): string => {
      const timestamp = new Date(now.getTime() - daysAgo * dayMs)
        .toISOString()
        .replace(/[:.]/g, "-");
      const filePath = path.join(tmpDir, `backup-${timestamp}.sql.gz`);
      fs.writeFileSync(filePath, Buffer.alloc(sizeBytes));
      return filePath;
    };

    it("should not delete files when under limit", () => {
      const filePath = writeBackup(60, 1024);

      const deleted = cleanupOldBackups(300, now);
      expect(deleted).toBe(0);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("should delete the oldest files older than 30 days while over limit", () => {
      const oldest = writeBackup(90);
      const old = writeBackup(60);
      const older30 = writeBackup(31);
      const fresh = writeBackup(1);

      const deleted = cleanupOldBackups(2, now);

      expect(deleted).toBe(2);
      expect(fs.existsSync(oldest)).toBe(false);
      expect(fs.existsSync(old)).toBe(false);
      expect(fs.existsSync(older30)).toBe(true);
      expect(fs.existsSync(fresh)).toBe(true);
    });

    it("should never delete backups younger than 30 days even far over the limit", () => {
      const files = [
        writeBackup(1, oneMb * 4),
        writeBackup(15, oneMb * 4),
        writeBackup(29, oneMb * 4),
      ];

      const deleted = cleanupOldBackups(1, now);

      expect(deleted).toBe(0);
      files.forEach((filePath) => expect(fs.existsSync(filePath)).toBe(true));
    });

    it("should always keep at least one backup", () => {
      const filePath = writeBackup(200, oneMb * 5);

      const deleted = cleanupOldBackups(1, now);
      expect(deleted).toBe(0);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("should remove temp files older than 24 hours and keep fresh ones", () => {
      const staleTmp = path.join(tmpDir, "backup-2026-10-14T00-00-00-000Z.sql.gz.tmp");
      const freshTmp = path.join(tmpDir, "backup-2026-10-16T11-59-00-000Z.sql.gz.tmp");
      fs.writeFileSync(staleTmp, "partial");
      fs.writeFileSync(freshTmp, "partial");
      const staleTime = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      fs.utimesSync(staleTmp, staleTime, staleTime);
      fs.utimesSync(freshTmp, now, now);

      cleanupOldBackups(300, now);

      expect(fs.existsSync(staleTmp)).toBe(false);
      expect(fs.existsSync(freshTmp)).toBe(true);
    });
  });

  describe("performBackup", () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;

    const mockDump = (writeBytes: number | null, error: Error | null = null) => {
      mockExec.mockImplementation(
        (cmd: string, _opts: unknown, cb: (err: unknown, result: unknown) => void) => {
          const match = cmd.match(/> "(.+)"/);
          if (match && writeBytes !== null) {
            fs.writeFileSync(match[1], Buffer.alloc(writeBytes));
          }
          cb(error, { stdout: "", stderr: "" });
        }
      );
    };

    beforeEach(() => {
      process.env.DATABASE_URL = "postgresql://user@localhost:5432/db?schema=public";
      mockExec.mockReset();
    });

    afterEach(() => {
      process.env.DATABASE_URL = originalDatabaseUrl;
    });

    it("should dump into a temp file and rename it to the final name", async () => {
      mockDump(1024);

      const filePath = await performBackup();

      const command = mockExec.mock.calls[0][0] as string;
      expect(command).toContain(`> "${filePath}.tmp"`);
      expect(path.basename(filePath)).toMatch(/^backup-.+Z\.sql\.gz$/);
      expect(fs.readdirSync(tmpDir)).toEqual([path.basename(filePath)]);
    });

    it("should leave neither file when pg_dump fails", async () => {
      mockDump(10, Object.assign(new Error("exit 1"), { stderr: "connection refused" }));

      await expect(performBackup()).rejects.toThrow("Ошибка pg_dump: connection refused");
      expect(fs.readdirSync(tmpDir)).toEqual([]);
    });

    it("should leave neither file when the dump is too small", async () => {
      mockDump(20);

      await expect(performBackup()).rejects.toThrow("Бэкап слишком мал (20 байт)");
      expect(fs.readdirSync(tmpDir)).toEqual([]);
    });
  });

  describe("runBackupJob", () => {
    it("should skip backup when disabled", async () => {
      await prisma.backupSettings.create({
        data: {
          id: "backup-settings-singleton",
          enabled: false,
          intervalHours: 6,
          maxStorageMb: 300,
        },
      });

      mockExec.mockClear();

      await runBackupJob();

      expect(mockExec).not.toHaveBeenCalled();
    });

    it("should skip backup when interval not yet elapsed", async () => {
      await prisma.backupSettings.create({
        data: {
          id: "backup-settings-singleton",
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
          lastBackupAt: new Date(),
        },
      });

      mockExec.mockClear();

      await runBackupJob();

      expect(mockExec).not.toHaveBeenCalled();
    });

    it("should run backup when interval elapsed", async () => {
      const sixHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
      await prisma.backupSettings.create({
        data: {
          id: "backup-settings-singleton",
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
          lastBackupAt: sixHoursAgo,
        },
      });

      mockExec.mockImplementation(
        (cmd: string, _opts: unknown, cb: (err: unknown, result: unknown) => void) => {
          const match = cmd.match(/> "(.+)"/);
          if (match) {
            fs.writeFileSync(match[1], Buffer.alloc(1024));
          }
          cb(null, { stdout: "", stderr: "" });
        }
      );

      await runBackupJob();

      expect(mockExec).toHaveBeenCalled();

      const settings = await prisma.backupSettings.findFirst();
      expect(settings!.lastBackupAt!.getTime()).toBeGreaterThan(sixHoursAgo.getTime());
    });

    it("should not start a parallel pg_dump while another is running (regression: cron overlap)", async () => {
      const sixHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
      await prisma.backupSettings.create({
        data: {
          id: "backup-settings-singleton",
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
          lastBackupAt: sixHoursAgo,
        },
      });

      let resolveFirstExec: () => void = () => undefined;
      const firstExecStarted = new Promise<void>((resolve) => {
        resolveFirstExec = resolve;
      });
      let resolveFirstExecBody: () => void = () => undefined;
      const firstExecBody = new Promise<void>((resolve) => {
        resolveFirstExecBody = resolve;
      });

      mockExec.mockClear();
      mockExec.mockImplementation(
        (cmd: string, _opts: unknown, cb: (err: unknown, result: unknown) => void) => {
          resolveFirstExec();
          firstExecBody.then(() => {
            const match = cmd.match(/> "(.+)"/);
            if (match) fs.writeFileSync(match[1], Buffer.alloc(1024));
            cb(null, { stdout: "", stderr: "" });
          });
        }
      );

      const first = runBackupJob();
      await firstExecStarted;
      // Second tick lands while first is mid-flight — must be a no-op.
      const second = runBackupJob();
      resolveFirstExecBody();
      await Promise.all([first, second]);

      expect(mockExec).toHaveBeenCalledTimes(1);
    });
  });
});
