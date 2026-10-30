import {
  describeBackupOverdue,
  describeDiskSpaceLow,
  describeOffsiteCapReached,
  describeOffsiteDiskSpaceLow,
  describeOffsiteStale,
  describeRestoreCheckStale,
  describeSizeDrop,
  describeStorageLimit,
  findSizeDrop,
  formatGigabytes,
  formatBackupSize,
  isDiskSpaceLow,
  isOlderThanHours,
  median,
  getDatabaseSecrets,
  redactSecrets,
} from "../backupAlerts.helpers";

const GIB = 1024 ** 3;
const NOW = new Date("2026-10-29T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

const backupFile = (hoursAgo: number, sizeMb: number) => {
  const time = new Date(NOW.getTime() - hoursAgo * HOUR_MS);
  return {
    name: `backup-${time.toISOString().replace(/[:.]/g, "-")}.sql.gz`,
    sizeMb,
    createdAt: NOW,
  };
};

describe("backupAlerts.helpers", () => {
  describe("isDiskSpaceLow", () => {
    const disk = (freeGib: number, totalGib = 77) => ({
      freeBytes: freeGib * GIB,
      totalBytes: totalGib * GIB,
    });

    it("should open below 2 GiB free", () => {
      expect(isDiskSpaceLow(disk(1.5), false)).toBe(true);
    });

    it("should open below 10% free even with many gigabytes", () => {
      expect(isDiskSpaceLow(disk(5, 64), false)).toBe(true);
    });

    it("should keep an open alert between the low and the OK marks", () => {
      expect(isDiskSpaceLow(disk(2.5, 20), true)).toBe(true);
    });

    it("should keep a closed alert closed between the marks", () => {
      expect(isDiskSpaceLow(disk(2.5, 20), false)).toBe(false);
    });

    it("should keep an open alert while free space is above 3 GiB but under 15%", () => {
      expect(isDiskSpaceLow(disk(10, 77), true)).toBe(true);
    });

    it("should close above 3 GiB and above 15% free", () => {
      expect(isDiskSpaceLow(disk(3.5, 17.5), true)).toBe(false);
    });

    it("should treat an empty filesystem report as low", () => {
      expect(isDiskSpaceLow({ freeBytes: 0, totalBytes: 0 }, false)).toBe(true);
    });
  });

  describe("median", () => {
    it("should take the middle of an odd list", () => {
      expect(median([5, 1, 3])).toBe(3);
    });

    it("should average the two middle values of an even list", () => {
      expect(median([4, 1, 3, 2])).toBe(2.5);
    });
  });

  describe("findSizeDrop", () => {
    const history = [10, 12, 10, 11, 10].map((size, index) => backupFile(60 - index * 6, size));

    it("should report no data with only 5 backups", () => {
      expect(findSizeDrop(history)).toBeUndefined();
    });

    it("should find a newest backup under half of the median of the 5 before", () => {
      const newest = backupFile(1, 4.9);

      expect(findSizeDrop([newest, ...history])).toEqual({ file: newest, medianMb: 10 });
    });

    it("should not flag a backup at exactly half of the median", () => {
      expect(findSizeDrop([...history, backupFile(1, 5)])).toBeNull();
    });

    it("should compare against the 5 backups right before the newest one", () => {
      const files = [backupFile(100, 1000), ...history, backupFile(1, 9)];

      expect(findSizeDrop(files)).toBeNull();
    });

    it("should order backups by time, not by list order", () => {
      const newest = backupFile(1, 1);

      expect(findSizeDrop([...history.slice(0, 2), newest, ...history.slice(2)])?.file).toBe(
        newest
      );
    });
  });

  describe("formatting", () => {
    it("should format gigabytes with one decimal and a comma", () => {
      expect(formatGigabytes(1.8 * GIB)).toBe("1,8 ГБ");
      expect(formatGigabytes(77 * GIB)).toBe("77,0 ГБ");
    });

    it("should format backup sizes in megabytes with one decimal and a comma", () => {
      expect(formatBackupSize(1.25)).toBe("1,3 МБ");
      expect(formatBackupSize(14.4)).toBe("14,4 МБ");
    });

    it("should format backup sizes under a megabyte in kilobytes", () => {
      expect(formatBackupSize(586 / 1024 / 1024)).toBe("1 КБ");
      expect(formatBackupSize(0.5)).toBe("512 КБ");
    });
  });

  describe("descriptions", () => {
    it("should describe an overdue backup with or without a previous one", () => {
      expect(
        describeBackupOverdue(new Date("2026-10-27T05:00:00Z"), new Date("2026-10-01T00:00:00Z"), 6)
      ).toBe("Последний бэкап: 27.10.2026 08:00 (МСК), при интервале 6 ч.");
      expect(describeBackupOverdue(null, new Date("2026-10-27T05:00:00Z"), 6)).toBe(
        "Бэкапов ещё не было, автобэкапы включены 27.10.2026 08:00 (МСК)."
      );
    });

    it("should describe a size drop", () => {
      expect(
        describeSizeDrop({
          file: { name: "backup-x.sql.gz", sizeMb: 0.1, createdAt: NOW },
          medianMb: 0.5,
        })
      ).toBe(
        "Последний бэкап backup-x.sql.gz: 102 КБ, медиана 5 предыдущих: 512 КБ. Возможна потеря данных или битый дамп."
      );
    });

    it("should describe the storage limit", () => {
      expect(describeStorageLimit(300)).toBe(
        "Бэкапы младше 30 дней занимают больше лимита 300 МБ, удалять нечего. Увеличьте лимит."
      );
    });

    it("should describe low disk space on the server", () => {
      expect(describeDiskSpaceLow({ freeBytes: 1.8 * GIB, totalBytes: 77 * GIB }, 9.6 * GIB)).toBe(
        "На сервере свободно 1,8 ГБ из 77,0 ГБ (2%), бэкапы занимают 9,6 ГБ."
      );
    });

    const report = {
      reportedAt: "2026-10-29T09:17:00Z",
      freeBytes: 1.5 * GIB,
      totalBytes: 234 * GIB,
      backupsBytes: 19.8 * GIB,
      capBytes: 20 * GIB,
      capPruned: true,
    };

    it("should describe low disk space at home", () => {
      expect(describeOffsiteDiskSpaceLow(report)).toBe(
        "На домашней машине свободно 1,5 ГБ из 234,0 ГБ (1%), копии занимают 19,8 ГБ. Отчёт от 29.10.2026 12:17 (МСК)."
      );
    });

    it("should describe the offsite cap", () => {
      expect(describeOffsiteCapReached(report)).toBe(
        "Копии занимают 19,8 ГБ при лимите 20,0 ГБ: удаляются копии моложе 90 дней."
      );
    });

    it("should describe a stale offsite pull", () => {
      expect(describeOffsiteStale("2026-10-26T06:17:00Z")).toBe(
        "Последнее копирование: 26.10.2026 09:17 (МСК), больше 24 часов назад."
      );
      expect(describeOffsiteStale(null)).toBe("Копирование ещё не выполнялось.");
    });

    it("should describe a stale restore check", () => {
      expect(describeRestoreCheckStale("2026-10-26T06:20:00Z")).toBe(
        "Последняя проверка: 26.10.2026 09:20 (МСК), больше 48 часов назад."
      );
      expect(describeRestoreCheckStale(null)).toBe("Проверка восстановления ещё не выполнялась.");
    });
  });

  describe("redactSecrets", () => {
    const URL_WITH_PASSWORD =
      "postgresql://app:p%40ss%2Fw0rd@db.local:5432/tutor_app?schema=public";

    it("should hide the full URL, the URL without Prisma params and the password", () => {
      const stderr = [
        `invalid connection string "${URL_WITH_PASSWORD}"`,
        'missing "=" after "postgresql://app:p%40ss%2Fw0rd@db.local:5432/tutor_app"',
        "password p@ss/w0rd rejected",
      ].join("\n");

      const redacted = redactSecrets(stderr, getDatabaseSecrets(URL_WITH_PASSWORD));

      expect(redacted).not.toContain("p%40ss%2Fw0rd");
      expect(redacted).not.toContain("p@ss/w0rd");
      expect(redacted).toContain('invalid connection string "***"');
    });

    it("should leave the text alone without a database URL", () => {
      expect(redactSecrets("connection refused", getDatabaseSecrets(""))).toBe(
        "connection refused"
      );
    });
  });

  describe("isOlderThanHours", () => {
    it("should treat a missing time as stale", () => {
      expect(isOlderThanHours(null, 24, NOW)).toBe(true);
    });

    it("should compare strictly against the threshold", () => {
      expect(isOlderThanHours("2026-10-28T12:00:00Z", 24, NOW)).toBe(false);
      expect(isOlderThanHours("2026-10-28T11:59:59Z", 24, NOW)).toBe(true);
    });
  });
});
