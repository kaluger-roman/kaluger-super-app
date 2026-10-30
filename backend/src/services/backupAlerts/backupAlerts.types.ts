import type { BackupFileInfo } from "../backup";

export type DiskSpace = { freeBytes: number; totalBytes: number };

export type SizeDropFile = Pick<BackupFileInfo, "name" | "sizeMb" | "createdAt">;

export type SizeDrop = { file: SizeDropFile; medianMb: number };
