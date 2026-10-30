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
  // Optional: a backend deployed before the frontend does not send them yet.
  syncStaleHours?: number;
  restoreCheckStaleHours?: number;
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

export type AdminAlertSeverity = "critical" | "warning";

export type AdminAlertEmailStatus =
  "pending" | "sent" | "failed" | "skipped_no_email" | "skipped_disabled";

export type AdminAlertEmail = {
  status: AdminAlertEmailStatus;
  attempts: number;
  lastError: string | null;
};

export type AdminAlert = {
  id: string;
  type: string;
  severity: AdminAlertSeverity;
  title: string;
  description: string;
  openedAt: string;
  lastSeenAt: string;
  occurrences: number;
  resolvedAt: string | null;
  readAt: string | null;
  openEmail: AdminAlertEmail;
  resolveEmail: AdminAlertEmail | null;
};

export type AdminSettings = {
  alertEmail: string | null;
  alertEmailEnabled: boolean;
};

export type AdminAlertsResponse = {
  alerts: AdminAlert[];
};

export type TestEmailResponse = {
  sentTo: string;
};
