import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "../../../lib/prisma";
import { clearTestMailbox, findLatestMailFor } from "../../../lib/testMailbox";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import { findActiveAlert, runAlertChecks, updateAdminSettings } from "../../adminAlerts";
import type { AdminAlertDefinition } from "../../adminAlerts";
import { updateBackupSettings } from "../../backup";
import {
  BACKUP_ALERT_DEFINITIONS,
  BACKUP_DISABLED_ALERT,
  BACKUP_OVERDUE_ALERT,
  BACKUP_SIZE_DROP_ALERT,
  BACKUP_STORAGE_LIMIT_ALERT,
  DISK_SPACE_LOW_ALERT,
  OFFSITE_CAP_REACHED_ALERT,
  OFFSITE_DISK_SPACE_LOW_ALERT,
  OFFSITE_STALE_ALERT,
  RESTORE_CHECK_FAILED_ALERT,
  RESTORE_CHECK_STALE_ALERT,
} from "../definitions";
import { getDiskSpace } from "../diskSpace";

jest.mock("../diskSpace", () => ({ getDiskSpace: jest.fn() }));

const mockedGetDiskSpace = jest.mocked(getDiskSpace);

const GIB = 1024 ** 3;
const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date("2026-10-29T12:00:00.000Z");
const ADDRESS = "alerts-backup-checks@example.com";

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * HOUR_MS);
const isoSeconds = (date: Date) => date.toISOString().replace(".000Z", "Z");

describe("backup alert checks", () => {
  let releaseBackupSettingsLock: () => Promise<void>;
  let releaseAdminAlertsLock: () => Promise<void>;
  let tmpDir: string;
  const originalBackupDir = process.env.BACKUP_DIR;

  const writeBackup = (ageHours: number, sizeBytes: number): string => {
    const name = `backup-${hoursAgo(ageHours).toISOString().replace(/[:.]/g, "-")}.sql.gz`;
    fs.writeFileSync(path.join(tmpDir, name), Buffer.alloc(sizeBytes));
    return name;
  };
  const writeDotFile = (name: string, content: string) =>
    fs.writeFileSync(path.join(tmpDir, name), content);
  const writeLastPull = (date: Date) => writeDotFile(".offsite-last-pull", `${isoSeconds(date)}\n`);
  const writeRestoreCheck = (date: Date, reason: string | null) =>
    writeDotFile(
      ".offsite-restore-check.json",
      JSON.stringify(
        reason
          ? { checkedAt: isoSeconds(date), fileName: null, status: "error", reason }
          : {
              checkedAt: isoSeconds(date),
              fileName: null,
              status: "success",
              counts: { users: 1, students: 2, lessons: 3 },
            }
      )
    );
  const writeStorageReport = (freeGib: number, capPruned = false) =>
    writeDotFile(
      ".offsite-storage.json",
      JSON.stringify({
        reportedAt: isoSeconds(hoursAgo(1)),
        freeBytes: Math.round(freeGib * GIB),
        totalBytes: 234 * GIB,
        backupsBytes: Math.round(19.8 * GIB),
        capBytes: 20 * GIB,
        capPruned,
      })
    );
  const setSettings = (data: {
    enabled?: boolean;
    intervalHours?: number;
    maxStorageMb?: number;
    lastBackupAt?: Date | null;
    enabledChangedAt?: Date;
  }) => prisma.backupSettings.update({ where: { id: "backup-settings-singleton" }, data });
  const setDisk = (freeGib: number, totalGib = 77) =>
    mockedGetDiskSpace.mockResolvedValue({ freeBytes: freeGib * GIB, totalBytes: totalGib * GIB });

  const run = (...definitions: AdminAlertDefinition[]) => runAlertChecks(definitions, NOW);
  const activeAlert = (definition: AdminAlertDefinition) => findActiveAlert(definition.type);

  beforeAll(async () => {
    releaseBackupSettingsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.BACKUP_SETTINGS);
    releaseAdminAlertsLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-alerts-test-"));
    process.env.BACKUP_DIR = tmpDir;
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await prisma.backupSettings.deleteMany();
    await prisma.backupSettings.create({
      data: {
        id: "backup-settings-singleton",
        enabled: true,
        intervalHours: 6,
        maxStorageMb: 300,
        lastBackupAt: hoursAgo(1),
        enabledChangedAt: hoursAgo(24 * 60),
      },
    });
    [36, 30, 24, 18, 12, 6].forEach((age) => writeBackup(age, 2048));
    writeLastPull(hoursAgo(1));
    writeRestoreCheck(hoursAgo(2), null);
    writeStorageReport(100);
    setDisk(40);
    clearTestMailbox();
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

  it("should open no alert when everything is healthy", async () => {
    await runAlertChecks(BACKUP_ALERT_DEFINITIONS, NOW);

    expect(await prisma.adminAlert.count()).toBe(0);
  });

  it("should define all 11 backup alert types", () => {
    expect(BACKUP_ALERT_DEFINITIONS.map(({ type }) => type)).toEqual([
      "backup_failed",
      "backup_overdue",
      "backup_disabled",
      "backup_size_drop",
      "backup_storage_limit",
      "disk_space_low",
      "offsite_disk_space_low",
      "offsite_cap_reached",
      "offsite_stale",
      "restore_check_failed",
      "restore_check_stale",
    ]);
  });

  describe("backup_overdue", () => {
    it("should open when the last backup is older than the interval plus 2 hours", async () => {
      await setSettings({ lastBackupAt: hoursAgo(8.5) });

      await run(BACKUP_OVERDUE_ALERT);

      const alert = await activeAlert(BACKUP_OVERDUE_ALERT);
      expect(alert).toMatchObject({ severity: "critical", title: "Бэкап давно не создавался" });
      expect(alert?.description).toBe(
        "Последний бэкап: 29.10.2026 06:30 (МСК), при интервале 6 ч."
      );
    });

    it("should stay closed within the grace period", async () => {
      await setSettings({ lastBackupAt: hoursAgo(7.5) });

      await run(BACKUP_OVERDUE_ALERT);

      expect(await activeAlert(BACKUP_OVERDUE_ALERT)).toBeNull();
    });

    it("should count from enabling when there were no backups yet", async () => {
      await setSettings({ lastBackupAt: null, enabledChangedAt: hoursAgo(9) });

      await run(BACKUP_OVERDUE_ALERT);

      expect((await activeAlert(BACKUP_OVERDUE_ALERT))?.description).toBe(
        "Бэкапов ещё не было, автобэкапы включены 29.10.2026 06:00 (МСК)."
      );
    });

    it("should not open right after enabling despite an old last backup", async () => {
      await setSettings({ lastBackupAt: hoursAgo(24 * 30), enabledChangedAt: hoursAgo(1) });

      await run(BACKUP_OVERDUE_ALERT);

      expect(await activeAlert(BACKUP_OVERDUE_ALERT)).toBeNull();
    });

    it("should close after a fresh backup", async () => {
      await setSettings({ lastBackupAt: hoursAgo(10) });
      await run(BACKUP_OVERDUE_ALERT);

      await setSettings({ lastBackupAt: hoursAgo(0.1) });
      await run(BACKUP_OVERDUE_ALERT);

      expect(await activeAlert(BACKUP_OVERDUE_ALERT)).toBeNull();
    });

    it("should close when autobackups are switched off", async () => {
      await setSettings({ lastBackupAt: hoursAgo(10) });
      await run(BACKUP_OVERDUE_ALERT);

      await setSettings({ enabled: false });
      await run(BACKUP_OVERDUE_ALERT);

      expect(await activeAlert(BACKUP_OVERDUE_ALERT)).toBeNull();
    });
  });

  describe("backup_disabled", () => {
    it("should open when autobackups have been off for more than an hour", async () => {
      await setSettings({ enabled: false, enabledChangedAt: hoursAgo(1.5) });

      await run(BACKUP_DISABLED_ALERT);

      expect(await activeAlert(BACKUP_DISABLED_ALERT)).toMatchObject({
        severity: "warning",
        title: "Автобэкапы выключены",
        description: "Автоматические бэкапы выключены в настройках больше часа.",
      });
    });

    it("should wait for an hour after switching off", async () => {
      await setSettings({ enabled: false, enabledChangedAt: hoursAgo(0.5) });

      await run(BACKUP_DISABLED_ALERT);

      expect(await activeAlert(BACKUP_DISABLED_ALERT)).toBeNull();
    });

    it("should not be opened by an interval edit while off", async () => {
      await setSettings({ enabled: false, enabledChangedAt: hoursAgo(0.5) });
      await updateBackupSettings({ intervalHours: 12 });

      await run(BACKUP_DISABLED_ALERT);

      expect(await activeAlert(BACKUP_DISABLED_ALERT)).toBeNull();
    });

    it("should close after switching autobackups back on", async () => {
      await setSettings({ enabled: false, enabledChangedAt: hoursAgo(3) });
      await run(BACKUP_DISABLED_ALERT);

      await setSettings({ enabled: true, enabledChangedAt: hoursAgo(0.1) });
      await run(BACKUP_DISABLED_ALERT);

      expect(await activeAlert(BACKUP_DISABLED_ALERT)).toBeNull();
    });
  });

  describe("backup_size_drop", () => {
    it("should open when the newest backup is under half of the median", async () => {
      const newest = writeBackup(1, 512);

      await run(BACKUP_SIZE_DROP_ALERT);

      const alert = await activeAlert(BACKUP_SIZE_DROP_ALERT);
      expect(alert).toMatchObject({ severity: "warning", eventKey: newest });
      expect(alert?.description).toContain(`Последний бэкап ${newest}`);
    });

    it("should close when the newest backup is back to normal", async () => {
      writeBackup(1, 512);
      await run(BACKUP_SIZE_DROP_ALERT);

      writeBackup(0.5, 2048);
      await run(BACKUP_SIZE_DROP_ALERT);

      expect(await activeAlert(BACKUP_SIZE_DROP_ALERT)).toBeNull();
    });

    it("should not check with fewer than 6 backups and keep an open alert", async () => {
      writeBackup(1, 512);
      await run(BACKUP_SIZE_DROP_ALERT);
      fs.readdirSync(tmpDir)
        .filter((name) => name.endsWith(".sql.gz"))
        .slice(0, 3)
        .forEach((name) => fs.unlinkSync(path.join(tmpDir, name)));

      await run(BACKUP_SIZE_DROP_ALERT);

      expect(await activeAlert(BACKUP_SIZE_DROP_ALERT)).not.toBeNull();
    });
  });

  describe("backup_storage_limit", () => {
    it("should open when fresh backups exceed the limit", async () => {
      await setSettings({ maxStorageMb: 1 });
      writeBackup(2, 1024 * 1024);

      await run(BACKUP_STORAGE_LIMIT_ALERT);

      expect((await activeAlert(BACKUP_STORAGE_LIMIT_ALERT))?.description).toBe(
        "Бэкапы младше 30 дней занимают больше лимита 1 МБ, удалять нечего. Увеличьте лимит."
      );
    });

    it("should close after the limit is raised", async () => {
      await setSettings({ maxStorageMb: 1 });
      writeBackup(2, 1024 * 1024);
      await run(BACKUP_STORAGE_LIMIT_ALERT);

      await setSettings({ maxStorageMb: 300 });
      await run(BACKUP_STORAGE_LIMIT_ALERT);

      expect(await activeAlert(BACKUP_STORAGE_LIMIT_ALERT)).toBeNull();
    });
  });

  describe("disk_space_low", () => {
    it("should open with the numbers when little space is left on the server", async () => {
      setDisk(1.8);

      await run(DISK_SPACE_LOW_ALERT);

      expect(mockedGetDiskSpace).toHaveBeenCalledWith(tmpDir);
      expect((await activeAlert(DISK_SPACE_LOW_ALERT))?.description).toMatch(
        /^На сервере свободно 1,8 ГБ из 77,0 ГБ \(2%\), бэкапы занимают 0,0 ГБ\.$/
      );
    });

    it("should stay open at 2.5 GiB after 1.5 GiB (hysteresis)", async () => {
      setDisk(1.5, 20);
      await run(DISK_SPACE_LOW_ALERT);

      setDisk(2.5, 20);
      await run(DISK_SPACE_LOW_ALERT);

      expect(await activeAlert(DISK_SPACE_LOW_ALERT)).not.toBeNull();
    });

    it("should close above 3 GiB and 15% free", async () => {
      setDisk(1.5);
      await run(DISK_SPACE_LOW_ALERT);

      setDisk(20);
      await run(DISK_SPACE_LOW_ALERT);

      expect(await activeAlert(DISK_SPACE_LOW_ALERT)).toBeNull();
    });
  });

  describe("offsite_disk_space_low", () => {
    it("should open from the home report and leave the server check closed", async () => {
      writeStorageReport(1.5);

      await run(OFFSITE_DISK_SPACE_LOW_ALERT, DISK_SPACE_LOW_ALERT);

      expect((await activeAlert(OFFSITE_DISK_SPACE_LOW_ALERT))?.description).toBe(
        "На домашней машине свободно 1,5 ГБ из 234,0 ГБ (1%), копии занимают 19,8 ГБ. Отчёт от 29.10.2026 14:00 (МСК)."
      );
      expect(await activeAlert(DISK_SPACE_LOW_ALERT)).toBeNull();
    });

    it("should close with a healthy report", async () => {
      writeStorageReport(1.5);
      await run(OFFSITE_DISK_SPACE_LOW_ALERT);

      writeStorageReport(100);
      await run(OFFSITE_DISK_SPACE_LOW_ALERT);

      expect(await activeAlert(OFFSITE_DISK_SPACE_LOW_ALERT)).toBeNull();
    });

    it("should keep its state while there is no report", async () => {
      writeStorageReport(1.5);
      await run(OFFSITE_DISK_SPACE_LOW_ALERT);

      fs.unlinkSync(path.join(tmpDir, ".offsite-storage.json"));
      await run(OFFSITE_DISK_SPACE_LOW_ALERT);

      expect(await activeAlert(OFFSITE_DISK_SPACE_LOW_ALERT)).not.toBeNull();
    });
  });

  describe("offsite_cap_reached", () => {
    it("should open when home pruned copies by the cap and close when it stopped", async () => {
      writeStorageReport(100, true);
      await run(OFFSITE_CAP_REACHED_ALERT);

      expect((await activeAlert(OFFSITE_CAP_REACHED_ALERT))?.description).toBe(
        "Копии занимают 19,8 ГБ при лимите 20,0 ГБ: удаляются копии моложе 90 дней."
      );

      writeStorageReport(100, false);
      await run(OFFSITE_CAP_REACHED_ALERT);

      expect(await activeAlert(OFFSITE_CAP_REACHED_ALERT)).toBeNull();
    });

    it("should not open the home checks before the first report", async () => {
      fs.unlinkSync(path.join(tmpDir, ".offsite-storage.json"));

      await run(OFFSITE_CAP_REACHED_ALERT, OFFSITE_DISK_SPACE_LOW_ALERT);

      expect(await prisma.adminAlert.count()).toBe(0);
    });
  });

  describe("offsite_stale", () => {
    it("should open when copies were never pulled", async () => {
      fs.unlinkSync(path.join(tmpDir, ".offsite-last-pull"));

      await run(OFFSITE_STALE_ALERT);

      expect((await activeAlert(OFFSITE_STALE_ALERT))?.description).toBe(
        "Копирование ещё не выполнялось."
      );
    });

    it("should close with a «[Решено]» letter after a fresh pull", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
      writeLastPull(hoursAgo(72));
      await run(OFFSITE_STALE_ALERT);
      expect(findLatestMailFor(ADDRESS)?.subject).toBe(
        "[Предупреждение] Резервное хранилище давно не обновлялось"
      );

      writeLastPull(hoursAgo(0.5));
      await run(OFFSITE_STALE_ALERT);

      expect(await activeAlert(OFFSITE_STALE_ALERT)).toBeNull();
      expect(findLatestMailFor(ADDRESS)?.subject).toBe(
        "[Решено] Резервное хранилище давно не обновлялось"
      );
    });
  });

  describe("restore_check_failed", () => {
    it("should open with the Russian reason", async () => {
      writeRestoreCheck(hoursAgo(1), "gzip_corrupt");

      await run(RESTORE_CHECK_FAILED_ALERT);

      expect(await activeAlert(RESTORE_CHECK_FAILED_ALERT)).toMatchObject({
        severity: "critical",
        description: "Последняя проверка восстановления на домашней машине: архив копии повреждён.",
      });
    });

    it("should update the same alert for another reason without a second letter", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
      writeRestoreCheck(hoursAgo(25), "gzip_corrupt");
      await run(RESTORE_CHECK_FAILED_ALERT);
      const first = await activeAlert(RESTORE_CHECK_FAILED_ALERT);
      clearTestMailbox();

      writeRestoreCheck(hoursAgo(1), "empty_table_lessons");
      await run(RESTORE_CHECK_FAILED_ALERT);

      const second = await activeAlert(RESTORE_CHECK_FAILED_ALERT);
      expect(second?.id).toBe(first?.id);
      expect(second?.occurrences).toBe(2);
      expect(second?.description).toContain("таблица lessons пуста");
      expect(findLatestMailFor(ADDRESS)).toBeUndefined();
    });

    it("should close after a successful check", async () => {
      writeRestoreCheck(hoursAgo(1), "gzip_corrupt");
      await run(RESTORE_CHECK_FAILED_ALERT);

      writeRestoreCheck(hoursAgo(0.5), null);
      await run(RESTORE_CHECK_FAILED_ALERT);

      expect(await activeAlert(RESTORE_CHECK_FAILED_ALERT)).toBeNull();
    });

    it.each([
      ["missing", () => fs.unlinkSync(path.join(tmpDir, ".offsite-restore-check.json"))],
      ["unreadable", () => writeDotFile(".offsite-restore-check.json", "{broken")],
    ])("should stay open when the check file is %s", async (_label, breakFile) => {
      writeRestoreCheck(hoursAgo(1), "gzip_corrupt");
      await run(RESTORE_CHECK_FAILED_ALERT);

      breakFile();
      await run(RESTORE_CHECK_FAILED_ALERT);

      expect(await activeAlert(RESTORE_CHECK_FAILED_ALERT)).not.toBeNull();
    });
  });

  describe("restore_check_stale", () => {
    it("should open when no check has run", async () => {
      fs.unlinkSync(path.join(tmpDir, ".offsite-restore-check.json"));

      await run(RESTORE_CHECK_STALE_ALERT);

      expect((await activeAlert(RESTORE_CHECK_STALE_ALERT))?.description).toBe(
        "Проверка восстановления ещё не выполнялась."
      );
    });

    it("should open for an old check of any status", async () => {
      writeRestoreCheck(hoursAgo(49), "gzip_corrupt");

      await run(RESTORE_CHECK_STALE_ALERT);

      expect((await activeAlert(RESTORE_CHECK_STALE_ALERT))?.description).toBe(
        "Последняя проверка: 27.10.2026 14:00 (МСК), больше 48 часов назад."
      );
    });

    it("should close after a check younger than 48 hours, even a failed one", async () => {
      writeRestoreCheck(hoursAgo(49), null);
      await run(RESTORE_CHECK_STALE_ALERT);

      writeRestoreCheck(hoursAgo(1), "gzip_corrupt");
      await run(RESTORE_CHECK_STALE_ALERT);

      expect(await activeAlert(RESTORE_CHECK_STALE_ALERT)).toBeNull();
    });
  });
});
