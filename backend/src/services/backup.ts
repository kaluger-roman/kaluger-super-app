import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";

const execAsync = promisify(exec);

const getBackupDir = (): string => {
  const dir = path.resolve(
    process.cwd(),
    process.env.BACKUP_DIR || "backups"
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const getBackupSettings = async () => {
  const settings = await prisma.backupSettings.findFirst();
  if (settings) return settings;

  return prisma.backupSettings.create({
    data: {
      enabled: true,
      intervalHours: 6,
      maxStorageMb: 300,
    },
  });
};

export const updateBackupSettings = async (data: {
  enabled?: boolean;
  intervalHours?: number;
  maxStorageMb?: number;
}) => {
  const settings = await getBackupSettings();
  return prisma.backupSettings.update({
    where: { id: settings.id },
    data,
  });
};

export const getBackupFiles = (): Array<{
  name: string;
  path: string;
  sizeMb: number;
  createdAt: Date;
}> => {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql.gz"))
    .map((name) => {
      const filePath = path.join(dir, name);
      const stats = fs.statSync(filePath);
      return {
        name,
        path: filePath,
        sizeMb: stats.size / (1024 * 1024),
        createdAt: stats.mtime,
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
};

export const getTotalSizeMb = (
  files: Array<{ sizeMb: number }>
): number => {
  return files.reduce((sum, f) => sum + f.sizeMb, 0);
};

export const cleanupOldBackups = (maxStorageMb: number): number => {
  const files = getBackupFiles();
  let totalSize = getTotalSizeMb(files);
  let deletedCount = 0;

  // Remove oldest files while over storage limit (keep at least 1)
  const sortedOldestFirst = [...files].reverse();

  for (const file of sortedOldestFirst) {
    if (totalSize <= maxStorageMb || files.length - deletedCount <= 1) break;

    fs.unlinkSync(file.path);
    totalSize -= file.sizeMb;
    deletedCount++;
  }

  return deletedCount;
};

export const performBackup = async (): Promise<string> => {
  const dir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql.gz`;
  const filePath = path.join(dir, filename);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL не задан");
  }

  await execAsync(`pg_dump "$DATABASE_URL" | gzip > "${filePath}"`, {
    timeout: 300000,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: "/bin/sh",
  });

  // Verify backup file was created and is not empty
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    fs.unlinkSync(filePath);
    throw new Error("Бэкап пуст — pg_dump вернул пустой результат");
  }

  return filePath;
};

export const createManualBackup = async (): Promise<{
  name: string;
  sizeMb: number;
  createdAt: Date;
}> => {
  const filePath = await performBackup();
  const stats = fs.statSync(filePath);

  const settings = await getBackupSettings();

  await prisma.backupSettings.update({
    where: { id: settings.id },
    data: { lastBackupAt: new Date() },
  });

  cleanupOldBackups(settings.maxStorageMb);

  return {
    name: path.basename(filePath),
    sizeMb: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
    createdAt: stats.mtime,
  };
};

export const runBackupJob = async (): Promise<void> => {
  const settings = await getBackupSettings();

  if (!settings.enabled) {
    return;
  }

  // Check if enough time has passed since last backup
  if (settings.lastBackupAt) {
    const hoursSinceLastBackup =
      (Date.now() - settings.lastBackupAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastBackup < settings.intervalHours) {
      return;
    }
  }

  console.log("Starting database backup...");

  const filePath = await performBackup();
  const stats = fs.statSync(filePath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Backup created: ${path.basename(filePath)} (${sizeMb} MB)`);

  // Update last backup timestamp
  await prisma.backupSettings.update({
    where: { id: settings.id },
    data: { lastBackupAt: new Date() },
  });

  // Clean up old backups
  const deletedCount = cleanupOldBackups(settings.maxStorageMb);
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} old backup(s)`);
  }
};
