import {
  isStorageLimitExceeded,
  parseBackupTimestamp,
  parseLastPull,
  parseRestoreCheck,
  selectBackupsToDelete,
  stripPrismaParams,
} from "../backup.helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-16T12:00:00.000Z");

const backupName = (date: Date): string =>
  `backup-${date.toISOString().replace(/[:.]/g, "-")}.sql.gz`;

const fileDaysAgo = (days: number, sizeMb = 1) => ({
  name: backupName(new Date(NOW.getTime() - days * DAY_MS)),
  sizeMb,
  createdAt: NOW,
});

describe("backup.helpers", () => {
  describe("parseBackupTimestamp", () => {
    it("should parse a name with milliseconds as UTC", () => {
      expect(parseBackupTimestamp("backup-2026-10-16T14-00-00-058Z.sql.gz")?.toISOString()).toBe(
        "2026-10-16T14:00:00.058Z"
      );
    });

    it("should parse a name without milliseconds", () => {
      expect(parseBackupTimestamp("backup-2026-10-16T14-00-00Z.sql.gz")?.toISOString()).toBe(
        "2026-10-16T14:00:00.000Z"
      );
    });

    it("should return null for a temp file", () => {
      expect(parseBackupTimestamp("backup-2026-10-16T14-00-00-058Z.sql.gz.tmp")).toBeNull();
    });

    it("should return null for a foreign name", () => {
      expect(parseBackupTimestamp("backup-2024-01-01.sql.gz")).toBeNull();
      expect(parseBackupTimestamp("notes.txt")).toBeNull();
    });

    it("should return null for an impossible calendar date", () => {
      expect(parseBackupTimestamp("backup-2026-13-40T14-00-00Z.sql.gz")).toBeNull();
      expect(parseBackupTimestamp("backup-2026-02-30T14-00-00Z.sql.gz")).toBeNull();
      expect(parseBackupTimestamp("backup-2026-10-16T25-00-00Z.sql.gz")).toBeNull();
    });
  });

  describe("selectBackupsToDelete", () => {
    it("should delete only files older than 30 days, oldest first, until under the limit", () => {
      const files = [fileDaysAgo(1), fileDaysAgo(40), fileDaysAgo(35), fileDaysAgo(60)];

      const result = selectBackupsToDelete(files, 2, NOW);

      expect(result.map((f) => f.name)).toEqual([files[3].name, files[1].name]);
    });

    it("should stop deleting once the total fits the limit", () => {
      const files = [fileDaysAgo(1), fileDaysAgo(40), fileDaysAgo(60)];

      const result = selectBackupsToDelete(files, 2, NOW);

      expect(result.map((f) => f.name)).toEqual([files[2].name]);
    });

    it("should delete nothing when every file is younger than 30 days even over the limit", () => {
      const files = [fileDaysAgo(1, 50), fileDaysAgo(10, 50), fileDaysAgo(29, 50)];

      expect(selectBackupsToDelete(files, 10, NOW)).toEqual([]);
    });

    it("should keep a file exactly 30 days old", () => {
      const files = [fileDaysAgo(1), fileDaysAgo(30)];

      expect(selectBackupsToDelete(files, 0, NOW)).toEqual([]);
    });

    it("should never delete every file", () => {
      const files = [fileDaysAgo(100, 5), fileDaysAgo(90, 5), fileDaysAgo(80, 5)];

      const result = selectBackupsToDelete(files, 0, NOW);

      expect(result.map((f) => f.name)).toEqual([files[0].name, files[1].name]);
    });

    it("should use createdAt when the name has no timestamp", () => {
      const old = {
        name: "backup-old.sql.gz",
        sizeMb: 1,
        createdAt: new Date(NOW.getTime() - 45 * DAY_MS),
      };
      const fresh = { name: "backup-fresh.sql.gz", sizeMb: 1, createdAt: NOW };

      expect(selectBackupsToDelete([fresh, old], 1, NOW)).toEqual([old]);
    });

    it("should prefer the name timestamp over createdAt", () => {
      const file = { ...fileDaysAgo(5), createdAt: new Date(NOW.getTime() - 90 * DAY_MS) };

      expect(selectBackupsToDelete([file, fileDaysAgo(1)], 0, NOW)).toEqual([]);
    });
  });

  describe("isStorageLimitExceeded", () => {
    it("should be true when files younger than 30 days alone exceed the limit", () => {
      const files = [fileDaysAgo(1, 200), fileDaysAgo(2, 150)];

      expect(isStorageLimitExceeded(files, 300, NOW)).toBe(true);
    });

    it("should be false when cleanup can bring old files under the limit", () => {
      const files = [fileDaysAgo(1, 200), fileDaysAgo(40, 150)];

      expect(isStorageLimitExceeded(files, 300, NOW)).toBe(false);
    });

    it("should be true when what remains after cleanup is still over the limit", () => {
      const files = [fileDaysAgo(1, 200), fileDaysAgo(2, 150), fileDaysAgo(40, 50)];

      expect(isStorageLimitExceeded(files, 300, NOW)).toBe(true);
    });

    it("should compare the total rounded like the API response", () => {
      expect(isStorageLimitExceeded([fileDaysAgo(1, 300.004)], 300, NOW)).toBe(false);
      expect(isStorageLimitExceeded([fileDaysAgo(1, 300.01)], 300, NOW)).toBe(true);
      expect(isStorageLimitExceeded([], 10, NOW)).toBe(false);
    });
  });

  describe("parseLastPull", () => {
    it("should return a valid UTC timestamp", () => {
      expect(parseLastPull("2026-10-16T14:17:03Z")).toBe("2026-10-16T14:17:03Z");
    });

    it("should ignore surrounding whitespace and the trailing newline", () => {
      expect(parseLastPull("  2026-10-16T14:17:03Z\n")).toBe("2026-10-16T14:17:03Z");
    });

    it("should return null for garbage or an empty file", () => {
      expect(parseLastPull("garbage")).toBeNull();
      expect(parseLastPull("")).toBeNull();
      expect(parseLastPull("2026-10-16 14:17:03")).toBeNull();
    });

    it("should return null for an impossible date", () => {
      expect(parseLastPull("2026-02-30T10:00:00Z")).toBeNull();
      expect(parseLastPull("2026-13-01T10:00:00Z")).toBeNull();
    });
  });

  describe("parseRestoreCheck", () => {
    const success = {
      checkedAt: "2026-10-16T05:47:12Z",
      fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
      status: "success",
      counts: { users: 14, students: 93, lessons: 2431 },
    };

    it("should parse a success result", () => {
      expect(parseRestoreCheck(JSON.stringify(success))).toEqual(success);
    });

    it("should map an error reason to Russian text", () => {
      const result = parseRestoreCheck(
        JSON.stringify({
          checkedAt: "2026-10-16T05:47:12Z",
          fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
          status: "error",
          reason: "empty_table_lessons",
        })
      );

      expect(result).toEqual({
        checkedAt: "2026-10-16T05:47:12Z",
        fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
        status: "error",
        error: "таблица lessons пуста",
      });
    });

    it.each([
      ["no_copy", "в резервном хранилище нет целых копий"],
      ["gzip_corrupt", "архив копии повреждён"],
      ["stale_copy", "самая свежая копия устарела — новые бэкапы не доходят"],
      ["docker_failed", "не удалось запустить временную базу"],
      ["restore_failed", "копия не разворачивается (ошибка SQL)"],
      ["query_failed", "не удалось прочитать данные из временной базы"],
      ["missing_table_users", "таблица users не найдена"],
      ["missing_table_students", "таблица students не найдена"],
      ["missing_table_lessons", "таблица lessons не найдена"],
      ["empty_table_users", "таблица users пуста"],
      ["empty_table_students", "таблица students пуста"],
      ["unexpected", "неизвестная ошибка"],
      ["constructor", "неизвестная ошибка"],
    ])("should map reason %s", (reason, error) => {
      const result = parseRestoreCheck(
        JSON.stringify({
          checkedAt: "2026-10-16T05:47:12Z",
          fileName: null,
          status: "error",
          reason,
        })
      );

      expect(result).toEqual({
        checkedAt: "2026-10-16T05:47:12Z",
        fileName: null,
        status: "error",
        error,
      });
    });

    it.each([
      ["negative count", { ...success, counts: { users: -1, students: 1, lessons: 1 } }],
      ["float count", { ...success, counts: { users: 1.5, students: 1, lessons: 1 } }],
      ["string count", { ...success, counts: { users: "1", students: 1, lessons: 1 } }],
      ["missing counts", { ...success, counts: undefined }],
      ["bad date", { ...success, checkedAt: "yesterday" }],
      ["bad file name", { ...success, fileName: "../etc/passwd" }],
      ["unknown status", { ...success, status: "maybe" }],
    ])("should return null for %s", (_label, payload) => {
      expect(parseRestoreCheck(JSON.stringify(payload))).toBeNull();
    });

    it("should return null for invalid JSON, arrays and null", () => {
      expect(parseRestoreCheck("{not json")).toBeNull();
      expect(parseRestoreCheck("[]")).toBeNull();
      expect(parseRestoreCheck("null")).toBeNull();
      expect(parseRestoreCheck("")).toBeNull();
    });
  });

  describe("stripPrismaParams", () => {
    it("should drop Prisma-only query params", () => {
      expect(
        stripPrismaParams("postgresql://u@localhost:5432/db?schema=public&sslmode=require")
      ).toBe("postgresql://u@localhost:5432/db?sslmode=require");
    });

    it("should return the input when it is not a URL", () => {
      expect(stripPrismaParams("not a url")).toBe("not a url");
    });
  });
});
