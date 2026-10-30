export type UpdateBackupSettingsDto = {
  enabled?: boolean;
  intervalHours?: number;
  maxStorageMb?: number;
};

export type BackupSettingsResponse = {
  enabled: boolean;
  intervalHours: number;
  maxStorageMb: number;
  lastBackupAt: string | null;
};

export type BackupFileResponse = {
  name: string;
  sizeMb: number;
  createdAt: string;
};

export type BackupRestoreCheckCounts = {
  users: number;
  students: number;
  lessons: number;
};

export type BackupRestoreCheck =
  | {
      checkedAt: string;
      fileName: string | null;
      status: "success";
      counts: BackupRestoreCheckCounts;
    }
  | {
      checkedAt: string;
      fileName: string | null;
      status: "error";
      error: string;
    };

export type BackupOffsiteStatus = {
  lastSyncAt: string | null;
  restoreCheck: BackupRestoreCheck | null;
  syncStaleHours: number;
  restoreCheckStaleHours: number;
};

export type BackupSettingsFullResponse = {
  settings: BackupSettingsResponse;
  files: BackupFileResponse[];
  totalSizeMb: number;
  minRetentionDays: number;
  storageLimitExceeded: boolean;
  offsite: BackupOffsiteStatus;
};
