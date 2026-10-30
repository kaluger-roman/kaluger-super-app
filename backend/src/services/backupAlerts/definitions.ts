import type { AdminAlertDefinition } from "../adminAlerts";
import {
  BYTES_PER_MB,
  OFFSITE_STALE_HOURS,
  RESTORE_CHECK_STALE_HOURS,
  getBackupDir,
  getBackupFiles,
  getBackupSettings,
  getOffsiteStatus,
  getTotalSizeMb,
  isStorageLimitExceeded,
  readOffsiteStorage,
} from "../backup";
import {
  BACKUP_ALERT_TYPE,
  BACKUP_DISABLED_GRACE_MS,
  BACKUP_OVERDUE_GRACE_HOURS,
  MS_PER_HOUR,
  RESOLVED,
} from "./backupAlerts.constants";
import {
  active,
  describeBackupOverdue,
  describeDiskSpaceLow,
  describeOffsiteCapReached,
  describeOffsiteDiskSpaceLow,
  describeOffsiteStale,
  describeRestoreCheckFailed,
  describeRestoreCheckStale,
  describeSizeDrop,
  describeStorageLimit,
  findSizeDrop,
  isDiskSpaceLow,
  isOlderThanHours,
} from "./backupAlerts.helpers";
import { getDiskSpace } from "./diskSpace";

// Event-only: raised and resolved by the backup attempt itself (backupAttempts.ts).
export const BACKUP_FAILED_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.backupFailed,
  severity: "critical",
  title: "Бэкап не создан",
};

export const BACKUP_OVERDUE_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.backupOverdue,
  severity: "critical",
  title: "Бэкап давно не создавался",
  check: async ({ now }) => {
    const { enabled, lastBackupAt, enabledChangedAt, intervalHours } = await getBackupSettings();
    if (!enabled) return RESOLVED;

    // Counting from the last switch-on keeps a fresh enable from looking overdue.
    const since = Math.max(lastBackupAt?.getTime() ?? 0, enabledChangedAt.getTime());
    const limitMs = (intervalHours + BACKUP_OVERDUE_GRACE_HOURS) * MS_PER_HOUR;
    return now.getTime() - since > limitMs
      ? active(describeBackupOverdue(lastBackupAt, enabledChangedAt, intervalHours))
      : RESOLVED;
  },
};

export const BACKUP_DISABLED_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.backupDisabled,
  severity: "warning",
  title: "Автобэкапы выключены",
  check: async ({ now }) => {
    const { enabled, enabledChangedAt } = await getBackupSettings();
    return !enabled && now.getTime() - enabledChangedAt.getTime() > BACKUP_DISABLED_GRACE_MS
      ? active("Автоматические бэкапы выключены в настройках больше часа.")
      : RESOLVED;
  },
};

export const BACKUP_SIZE_DROP_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.backupSizeDrop,
  severity: "warning",
  title: "Бэкап резко уменьшился",
  check: async () => {
    const drop = findSizeDrop(getBackupFiles());
    if (drop === undefined) return null;
    return drop ? active(describeSizeDrop(drop), drop.file.name) : RESOLVED;
  },
};

export const BACKUP_STORAGE_LIMIT_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.backupStorageLimit,
  severity: "warning",
  title: "Превышен лимит хранения бэкапов",
  check: async ({ now }) => {
    const { maxStorageMb } = await getBackupSettings();
    return isStorageLimitExceeded(getBackupFiles(), maxStorageMb, now)
      ? active(describeStorageLimit(maxStorageMb))
      : RESOLVED;
  },
};

export const DISK_SPACE_LOW_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.diskSpaceLow,
  severity: "critical",
  title: "Мало места на диске сервера",
  check: async ({ activeAlert }) => {
    const space = await getDiskSpace(getBackupDir());
    if (!isDiskSpaceLow(space, Boolean(activeAlert))) return RESOLVED;
    const backupsBytes = Math.round(getTotalSizeMb(getBackupFiles()) * BYTES_PER_MB);
    return active(describeDiskSpaceLow(space, backupsBytes));
  },
};

export const OFFSITE_DISK_SPACE_LOW_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.offsiteDiskSpaceLow,
  severity: "critical",
  title: "Мало места на диске резервного хранилища",
  check: async ({ activeAlert }) => {
    const report = readOffsiteStorage();
    if (!report) return null;
    return isDiskSpaceLow(report, Boolean(activeAlert))
      ? active(describeOffsiteDiskSpaceLow(report))
      : RESOLVED;
  },
};

export const OFFSITE_CAP_REACHED_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.offsiteCapReached,
  severity: "warning",
  title: "Резервное хранилище упёрлось в лимит",
  check: async () => {
    const report = readOffsiteStorage();
    if (!report) return null;
    return report.capPruned ? active(describeOffsiteCapReached(report)) : RESOLVED;
  },
};

export const OFFSITE_STALE_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.offsiteStale,
  severity: "warning",
  title: "Резервное хранилище давно не обновлялось",
  check: async ({ now }) => {
    const { lastSyncAt } = getOffsiteStatus();
    return isOlderThanHours(lastSyncAt, OFFSITE_STALE_HOURS, now)
      ? active(describeOffsiteStale(lastSyncAt))
      : RESOLVED;
  },
};

export const RESTORE_CHECK_FAILED_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.restoreCheckFailed,
  severity: "critical",
  title: "Проверка восстановления завершилась ошибкой",
  check: async () => {
    const { restoreCheck } = getOffsiteStatus();
    if (!restoreCheck) return null;
    return restoreCheck.status === "error"
      ? active(describeRestoreCheckFailed(restoreCheck.error), restoreCheck.checkedAt)
      : RESOLVED;
  },
};

export const RESTORE_CHECK_STALE_ALERT: AdminAlertDefinition = {
  type: BACKUP_ALERT_TYPE.restoreCheckStale,
  severity: "warning",
  title: "Проверка восстановления давно не выполнялась",
  check: async ({ now }) => {
    const checkedAt = getOffsiteStatus().restoreCheck?.checkedAt ?? null;
    return isOlderThanHours(checkedAt, RESTORE_CHECK_STALE_HOURS, now)
      ? active(describeRestoreCheckStale(checkedAt))
      : RESOLVED;
  },
};

export const BACKUP_ALERT_DEFINITIONS: AdminAlertDefinition[] = [
  BACKUP_FAILED_ALERT,
  BACKUP_OVERDUE_ALERT,
  BACKUP_DISABLED_ALERT,
  BACKUP_SIZE_DROP_ALERT,
  BACKUP_STORAGE_LIMIT_ALERT,
  DISK_SPACE_LOW_ALERT,
  OFFSITE_DISK_SPACE_LOW_ALERT,
  OFFSITE_CAP_REACHED_ALERT,
  OFFSITE_STALE_ALERT,
  RESTORE_CHECK_FAILED_ALERT,
  RESTORE_CHECK_STALE_ALERT,
];

// The checks a backup attempt can change on prod, rerun right after it.
export const PROD_BACKUP_DEFINITIONS: AdminAlertDefinition[] = [
  BACKUP_OVERDUE_ALERT,
  BACKUP_SIZE_DROP_ALERT,
  BACKUP_STORAGE_LIMIT_ALERT,
  DISK_SPACE_LOW_ALERT,
];

// The checks a change of the backup settings can flip, rerun right after it.
export const BACKUP_SETTINGS_DEFINITIONS: AdminAlertDefinition[] = [
  BACKUP_OVERDUE_ALERT,
  BACKUP_DISABLED_ALERT,
  BACKUP_STORAGE_LIMIT_ALERT,
];
