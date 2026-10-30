import type { AlertCheckResult } from "../adminAlerts";

export const BACKUP_ALERT_TYPE = {
  backupFailed: "backup_failed",
  backupOverdue: "backup_overdue",
  backupDisabled: "backup_disabled",
  backupSizeDrop: "backup_size_drop",
  backupStorageLimit: "backup_storage_limit",
  diskSpaceLow: "disk_space_low",
  offsiteDiskSpaceLow: "offsite_disk_space_low",
  offsiteCapReached: "offsite_cap_reached",
  offsiteStale: "offsite_stale",
  restoreCheckFailed: "restore_check_failed",
  restoreCheckStale: "restore_check_stale",
} as const;

const GIB = 1024 * 1024 * 1024;

// Open below either low mark, close only above both OK marks; in between the state is kept.
export const DISK_LOW_FREE_BYTES = 2 * GIB;
export const DISK_LOW_FREE_RATIO = 0.1;
export const DISK_OK_FREE_BYTES = 3 * GIB;
export const DISK_OK_FREE_RATIO = 0.15;

export const BACKUP_OVERDUE_GRACE_HOURS = 2;
export const BACKUP_DISABLED_GRACE_MS = 60 * 60 * 1000;
export const SIZE_DROP_RATIO = 0.5;
export const SIZE_DROP_SAMPLE = 5;

export const BYTES_PER_GIB = GIB;
export const MS_PER_HOUR = 60 * 60 * 1000;

export const RESOLVED: AlertCheckResult = { active: false };

export const REDACTED = "***";
