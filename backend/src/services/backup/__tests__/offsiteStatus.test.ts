import fs from "fs";
import os from "os";
import path from "path";
import { getOffsiteStatus, readOffsiteStorage } from "../offsiteStatus";

describe("getOffsiteStatus", () => {
  let tmpDir: string;
  const originalBackupDir = process.env.BACKUP_DIR;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "offsite-status-test-"));
    process.env.BACKUP_DIR = tmpDir;
  });

  afterEach(() => {
    process.env.BACKUP_DIR = originalBackupDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should return nulls when no status files exist", () => {
    expect(getOffsiteStatus()).toEqual({
      lastSyncAt: null,
      restoreCheck: null,
      syncStaleHours: 24,
      restoreCheckStaleHours: 48,
    });
  });

  it("should return the last pull time from the stamp file", () => {
    fs.writeFileSync(path.join(tmpDir, ".offsite-last-pull"), "2026-10-16T14:17:03Z\n");

    expect(getOffsiteStatus().lastSyncAt).toBe("2026-10-16T14:17:03Z");
  });

  it("should return null for a garbage stamp", () => {
    fs.writeFileSync(path.join(tmpDir, ".offsite-last-pull"), "\u0000garbage");

    expect(getOffsiteStatus().lastSyncAt).toBeNull();
  });

  it("should return null when the stamp path is a directory", () => {
    fs.mkdirSync(path.join(tmpDir, ".offsite-last-pull"));
    fs.mkdirSync(path.join(tmpDir, ".offsite-restore-check.json"));

    expect(getOffsiteStatus()).toMatchObject({ lastSyncAt: null, restoreCheck: null });
  });

  it("should return the restore check result from the JSON file", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".offsite-restore-check.json"),
      JSON.stringify({
        checkedAt: "2026-10-16T05:47:12Z",
        fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
        status: "success",
        counts: { users: 14, students: 93, lessons: 2431 },
      })
    );

    expect(getOffsiteStatus().restoreCheck).toEqual({
      checkedAt: "2026-10-16T05:47:12Z",
      fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
      status: "success",
      counts: { users: 14, students: 93, lessons: 2431 },
    });
  });

  it("should return null for a corrupt restore check file", () => {
    fs.writeFileSync(path.join(tmpDir, ".offsite-restore-check.json"), '{"checkedAt":');

    expect(getOffsiteStatus().restoreCheck).toBeNull();
  });

  describe("readOffsiteStorage", () => {
    it("should return null when the home machine has not reported yet", () => {
      expect(readOffsiteStorage()).toBeNull();
    });

    it("should return the parsed storage report", () => {
      fs.writeFileSync(
        path.join(tmpDir, ".offsite-storage.json"),
        '{"reportedAt":"2026-10-29T10:17:03Z","freeBytes":1610612736,"totalBytes":250059350016,"backupsBytes":209715200,"capBytes":21474836480,"capPruned":false}\n'
      );

      expect(readOffsiteStorage()).toEqual({
        reportedAt: "2026-10-29T10:17:03Z",
        freeBytes: 1610612736,
        totalBytes: 250059350016,
        backupsBytes: 209715200,
        capBytes: 21474836480,
        capPruned: false,
      });
    });

    it("should return null for a malformed report", () => {
      fs.writeFileSync(path.join(tmpDir, ".offsite-storage.json"), '{"reportedAt":1}');

      expect(readOffsiteStorage()).toBeNull();
    });
  });
});
