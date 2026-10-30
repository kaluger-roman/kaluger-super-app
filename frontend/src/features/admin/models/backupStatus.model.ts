import { createStore, sample } from "effector";

import type { BackupSettingsFullResponse, RestoreCheckResult } from "@shared";

import * as adminDataModel from "./adminData.model";
import {
  DEFAULT_MIN_RETENTION_DAYS,
  DEFAULT_OFFSITE_SYNC_STALE_HOURS,
  DEFAULT_RESTORE_CHECK_STALE_HOURS,
} from "./backupStatus.constants";

export const $minRetentionDays = createStore<number>(DEFAULT_MIN_RETENTION_DAYS);
export const $storageLimitExceeded = createStore<boolean>(false);
export const $offsiteLastSyncAt = createStore<string | null>(null);
export const $restoreCheck = createStore<RestoreCheckResult | null>(null);
export const $offsiteSyncStaleHours = createStore<number>(DEFAULT_OFFSITE_SYNC_STALE_HOURS);
export const $restoreCheckStaleHours = createStore<number>(DEFAULT_RESTORE_CHECK_STALE_HOURS);

sample({
  clock: adminDataModel.getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.minRetentionDays ?? DEFAULT_MIN_RETENTION_DAYS,
  target: $minRetentionDays,
});

sample({
  clock: adminDataModel.getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.storageLimitExceeded ?? false,
  target: $storageLimitExceeded,
});

sample({
  clock: adminDataModel.getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.offsite?.lastSyncAt ?? null,
  target: $offsiteLastSyncAt,
});

sample({
  clock: adminDataModel.getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.offsite?.restoreCheck ?? null,
  target: $restoreCheck,
});

sample({
  clock: adminDataModel.getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) =>
    data.offsite?.syncStaleHours ?? DEFAULT_OFFSITE_SYNC_STALE_HOURS,
  target: $offsiteSyncStaleHours,
});

sample({
  clock: adminDataModel.getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) =>
    data.offsite?.restoreCheckStaleHours ?? DEFAULT_RESTORE_CHECK_STALE_HOURS,
  target: $restoreCheckStaleHours,
});
