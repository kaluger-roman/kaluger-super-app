import fs from "fs";
import path from "path";
import type { BackupOffsiteStatus } from "../../types";
import { getBackupDir } from "./backup";
import {
  OFFSITE_LAST_PULL_FILE,
  OFFSITE_STALE_HOURS,
  OFFSITE_STORAGE_FILE,
  RESTORE_CHECK_FILE,
  RESTORE_CHECK_STALE_HOURS,
} from "./backup.constants";
import { parseLastPull, parseOffsiteStorage, parseRestoreCheck } from "./backup.helpers";
import type { OffsiteStorageReport } from "./backup.types";

// The files are written on prod by the offsite SSH wrapper; a missing or
// unreadable file means "never happened", it must not break the settings page.
const readStatusFile = (name: string): string | null => {
  try {
    return fs.readFileSync(path.join(getBackupDir(), name), "utf8");
  } catch {
    return null;
  }
};

export const getOffsiteStatus = (): BackupOffsiteStatus => {
  const lastPull = readStatusFile(OFFSITE_LAST_PULL_FILE);
  const restoreCheck = readStatusFile(RESTORE_CHECK_FILE);

  return {
    lastSyncAt: lastPull === null ? null : parseLastPull(lastPull),
    restoreCheck: restoreCheck === null ? null : parseRestoreCheck(restoreCheck),
    syncStaleHours: OFFSITE_STALE_HOURS,
    restoreCheckStaleHours: RESTORE_CHECK_STALE_HOURS,
  };
};

export const readOffsiteStorage = (): OffsiteStorageReport | null => {
  const content = readStatusFile(OFFSITE_STORAGE_FILE);
  return content === null ? null : parseOffsiteStorage(content);
};
