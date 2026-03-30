import fs from "fs";
import path from "path";
import os from "os";
import prisma from "../../lib/prisma";
import {
  getTotalSizeMb,
  cleanupOldBackups,
  getBackupSettings,
  runBackupJob,
} from "../backup";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

// Мокаем pg_dump через child_process
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

describe("backup service", () => {
  let tmpDir: string;
  const originalEnv = process.env.BACKUP_DIR;

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
  });

  describe("cleanupOldBackups", () => {
    it("should not delete files when under limit", () => {
      // Создаём файл ~1KB
      const filePath = path.join(tmpDir, "backup-2024-01-01.sql.gz");
      fs.writeFileSync(filePath, Buffer.alloc(1024));

      const deleted = cleanupOldBackups(300);
      expect(deleted).toBe(0);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("should delete oldest files when over limit", () => {
      // Создаём файлы, 1MB каждый
      const oneKb = 1024;
      const oneMb = oneKb * 1024;

      const file1 = path.join(tmpDir, "backup-2024-01-01.sql.gz");
      const file2 = path.join(tmpDir, "backup-2024-01-02.sql.gz");
      const file3 = path.join(tmpDir, "backup-2024-01-03.sql.gz");

      fs.writeFileSync(file1, Buffer.alloc(oneMb));
      fs.writeFileSync(file2, Buffer.alloc(oneMb));
      fs.writeFileSync(file3, Buffer.alloc(oneMb));

      // Лимит 2МБ — один файл должен быть удалён
      const deleted = cleanupOldBackups(2);
      expect(deleted).toBe(1);
    });

    it("should always keep at least one backup", () => {
      const oneMb = 1024 * 1024;
      const filePath = path.join(tmpDir, "backup-2024-01-01.sql.gz");
      fs.writeFileSync(filePath, Buffer.alloc(oneMb * 5));

      // Лимит 1МБ, но единственный файл 5МБ — не удаляем
      const deleted = cleanupOldBackups(1);
      expect(deleted).toBe(0);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe("runBackupJob", () => {
    it("should skip backup when disabled", async () => {
      await prisma.backupSettings.create({
        data: { enabled: false, intervalHours: 6, maxStorageMb: 300 },
      });

      const { execSync } = require("child_process");
      (execSync as jest.Mock).mockClear();

      await runBackupJob();

      expect(execSync).not.toHaveBeenCalled();
    });

    it("should skip backup when interval not yet elapsed", async () => {
      await prisma.backupSettings.create({
        data: {
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
          lastBackupAt: new Date(), // только что сделан
        },
      });

      const { execSync } = require("child_process");
      (execSync as jest.Mock).mockClear();

      await runBackupJob();

      expect(execSync).not.toHaveBeenCalled();
    });

    it("should run backup when interval elapsed", async () => {
      const sixHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
      await prisma.backupSettings.create({
        data: {
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
          lastBackupAt: sixHoursAgo,
        },
      });

      const { execSync } = require("child_process");
      (execSync as jest.Mock).mockImplementation(
        (cmd: string) => {
          // Имитируем pg_dump — создаём файл
          const match = cmd.match(/> "(.+)"/);
          if (match) {
            fs.writeFileSync(match[1], Buffer.alloc(1024));
          }
        }
      );

      await runBackupJob();

      expect(execSync).toHaveBeenCalled();

      // Проверяем что lastBackupAt обновилось
      const settings = await prisma.backupSettings.findFirst();
      expect(settings!.lastBackupAt!.getTime()).toBeGreaterThan(
        sixHoursAgo.getTime()
      );
    });
  });
});
