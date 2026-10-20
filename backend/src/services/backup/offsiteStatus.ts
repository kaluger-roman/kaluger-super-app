import fs from "fs";
import path from "path";
import type { BackupOffsiteStatus } from "../../types";
import { getBackupDir } from "./backup";
import { OFFSITE_LAST_PULL_FILE, RESTORE_CHECK_FILE } from "./backup.constants";
import { parseLastPull, parseRestoreCheck } from "./backup.helpers";

// Both files are written on prod by the offsite SSH wrapper; a missing or
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
  };
};
