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
