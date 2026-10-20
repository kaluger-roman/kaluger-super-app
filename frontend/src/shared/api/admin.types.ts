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

export type RestoreCheckCounts = {
  users: number;
  students: number;
  lessons: number;
};

export type RestoreCheckResult =
  | { checkedAt: string; fileName: string | null; status: "success"; counts: RestoreCheckCounts }
  | { checkedAt: string; fileName: string | null; status: "error"; error: string };

export type BackupOffsiteStatus = {
  lastSyncAt: string | null;
  restoreCheck: RestoreCheckResult | null;
};

export type BackupSettingsFullResponse = {
  settings: BackupSettingsData;
  files: BackupFileData[];
  totalSizeMb: number;
  // Optional: a backend deployed before the frontend does not send them yet.
  minRetentionDays?: number;
  storageLimitExceeded?: boolean;
  offsite?: BackupOffsiteStatus;
};
