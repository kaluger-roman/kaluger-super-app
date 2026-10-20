export type BackupFileInfo = {
  name: string;
  path: string;
  sizeMb: number;
  createdAt: Date;
};

export type BackupRetentionCandidate = Pick<BackupFileInfo, "name" | "sizeMb" | "createdAt">;
