import fs from "fs";
import os from "os";
import path from "path";
import { getOffsiteStatus } from "../offsiteStatus";

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
    expect(getOffsiteStatus()).toEqual({ lastSyncAt: null, restoreCheck: null });
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

    expect(getOffsiteStatus()).toEqual({ lastSyncAt: null, restoreCheck: null });
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
});
