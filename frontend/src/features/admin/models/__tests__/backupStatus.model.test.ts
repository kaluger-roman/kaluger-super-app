import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import type { BackupSettingsFullResponse } from "@shared";

import { getBackupSettingsFx } from "../adminData.model";
import {
  $minRetentionDays,
  $offsiteLastSyncAt,
  $offsiteSyncStaleHours,
  $restoreCheck,
  $restoreCheckStaleHours,
  $storageLimitExceeded,
} from "../backupStatus.model";

const response: BackupSettingsFullResponse = {
  settings: { enabled: true, intervalHours: 6, maxStorageMb: 10, lastBackupAt: null },
  files: [],
  totalSizeMb: 14.4,
  minRetentionDays: 45,
  storageLimitExceeded: true,
  offsite: {
    lastSyncAt: "2026-10-16T14:17:03Z",
    restoreCheck: {
      checkedAt: "2026-10-16T05:47:12Z",
      fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
      status: "success",
      counts: { users: 14, students: 93, lessons: 2431 },
    },
    syncStaleHours: 12,
    restoreCheckStaleHours: 36,
  },
};

const loadSettings = async (data: BackupSettingsFullResponse) => {
  const scope = fork({ handlers: [[getBackupSettingsFx, () => Promise.resolve(data)]] });
  await allSettled(getBackupSettingsFx, { scope });
  return scope;
};

describe("features/admin/models/backupStatus.model", () => {
  it("should have safe defaults before the settings are loaded", () => {
    const scope = fork();

    expect(scope.getState($minRetentionDays)).toBe(30);
    expect(scope.getState($storageLimitExceeded)).toBe(false);
    expect(scope.getState($offsiteLastSyncAt)).toBeNull();
    expect(scope.getState($restoreCheck)).toBeNull();
    expect(scope.getState($offsiteSyncStaleHours)).toBe(24);
    expect(scope.getState($restoreCheckStaleHours)).toBe(48);
  });

  it("should take the offsite stale thresholds from the response", async () => {
    const scope = await loadSettings(response);

    expect(scope.getState($offsiteSyncStaleHours)).toBe(12);
    expect(scope.getState($restoreCheckStaleHours)).toBe(36);
  });

  it("should take the retention floor and the limit flag from the response", async () => {
    const scope = await loadSettings(response);

    expect(scope.getState($minRetentionDays)).toBe(45);
    expect(scope.getState($storageLimitExceeded)).toBe(true);
  });

  it("should take the offsite sync time and the restore check from the response", async () => {
    const scope = await loadSettings(response);

    expect(scope.getState($offsiteLastSyncAt)).toBe("2026-10-16T14:17:03Z");
    expect(scope.getState($restoreCheck)).toEqual(response.offsite?.restoreCheck);
  });

  it("should fall back to defaults when the backend does not send the new fields yet", async () => {
    const legacy: BackupSettingsFullResponse = {
      settings: response.settings,
      files: response.files,
      totalSizeMb: response.totalSizeMb,
    };
    const scope = fork({
      values: [
        [$offsiteLastSyncAt, "2026-10-16T14:17:03Z"],
        [$storageLimitExceeded, true],
        [$offsiteSyncStaleHours, 12],
        [$restoreCheckStaleHours, 36],
      ],
      handlers: [[getBackupSettingsFx, () => Promise.resolve(legacy)]],
    });

    await allSettled(getBackupSettingsFx, { scope });

    expect(scope.getState($minRetentionDays)).toBe(30);
    expect(scope.getState($storageLimitExceeded)).toBe(false);
    expect(scope.getState($offsiteLastSyncAt)).toBeNull();
    expect(scope.getState($restoreCheck)).toBeNull();
    expect(scope.getState($offsiteSyncStaleHours)).toBe(24);
    expect(scope.getState($restoreCheckStaleHours)).toBe(48);
  });

  it("should reset the offsite fields to null when a later response has none", async () => {
    const scope = fork({
      values: [
        [$offsiteLastSyncAt, "2026-10-16T14:17:03Z"],
        [$restoreCheck, response.offsite?.restoreCheck ?? null],
        [$storageLimitExceeded, true],
      ],
      handlers: [
        [
          getBackupSettingsFx,
          () =>
            Promise.resolve({
              ...response,
              storageLimitExceeded: false,
              offsite: { lastSyncAt: null, restoreCheck: null },
            }),
        ],
      ],
    });

    await allSettled(getBackupSettingsFx, { scope });

    expect(scope.getState($offsiteLastSyncAt)).toBeNull();
    expect(scope.getState($restoreCheck)).toBeNull();
    expect(scope.getState($storageLimitExceeded)).toBe(false);
  });
});
