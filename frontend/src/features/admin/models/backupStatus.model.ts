import { createStore, sample } from "effector";

import type { BackupSettingsFullResponse, RestoreCheckResult } from "@shared";

import * as adminDataModel from "./adminData.model";
import { DEFAULT_MIN_RETENTION_DAYS } from "./backupStatus.constants";

export const $minRetentionDays = createStore<number>(DEFAULT_MIN_RETENTION_DAYS);
export const $storageLimitExceeded = createStore<boolean>(false);
export const $offsiteLastSyncAt = createStore<string | null>(null);
export const $restoreCheck = createStore<RestoreCheckResult | null>(null);

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
