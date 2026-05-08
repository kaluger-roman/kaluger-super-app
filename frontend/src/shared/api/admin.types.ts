export type AdminOverviewResponse = {
  usersCount: number;
  studentsCount: number;
  lessonsCount: number;
  serverUptime: number;
};

export type BackupSettingsData = {
  enabled: boolean;
  intervalHours: number;
  maxStorageMb: number;
  lastBackupAt: string | null;
};

export type BackupFileData = {
  name: string;
  sizeMb: number;
  createdAt: string;
};

export type BackupSettingsFullResponse = {
  settings: BackupSettingsData;
  files: BackupFileData[];
  totalSizeMb: number;
};
