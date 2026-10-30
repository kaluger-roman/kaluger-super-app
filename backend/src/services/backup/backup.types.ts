export type BackupFileInfo = {
  name: string;
  path: string;
  sizeMb: number;
  createdAt: Date;
};

export type BackupRetentionCandidate = Pick<BackupFileInfo, "name" | "sizeMb" | "createdAt">;

export type BackupJobOutcome = { status: "skipped" } | { status: "created"; fileName: string };

export type OffsiteStorageReport = {
  reportedAt: string;
  freeBytes: number;
  totalBytes: number;
  backupsBytes: number;
  capBytes: number;
  capPruned: boolean;
};
