import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  BACKUP_FILE_EXTENSION,
  BACKUP_SETTINGS_ID,
  BACKUP_TMP_SUFFIX,
  BYTES_PER_MB,
  MIN_BACKUP_SIZE_BYTES,
  PG_DUMP_TIMEOUT_MS,
} from "./backup.constants";
import {
  removeIfExists,
  removeStaleTmpFiles,
  selectBackupsToDelete,
  stripPrismaParams,
} from "./backup.helpers";
import type { BackupFileInfo } from "./backup.types";

const execAsync = promisify(exec);

export const getBackupDir = (): string => {
  const dir = path.resolve(process.cwd(), process.env.BACKUP_DIR || "backups");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const getBackupSettings = async () => {
  try {
    return await prisma.backupSettings.upsert({
      where: { id: BACKUP_SETTINGS_ID },
      update: {},
      create: {
        id: BACKUP_SETTINGS_ID,
        enabled: true,
        intervalHours: 6,
        maxStorageMb: 300,
      },
    });
  } catch (err) {
    // Prisma 6 upsert is select-then-insert: a parallel first call can lose the INSERT race
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.backupSettings.findUniqueOrThrow({ where: { id: BACKUP_SETTINGS_ID } });
    }
    throw err;
  }
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

export const getBackupFiles = (): BackupFileInfo[] => {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(BACKUP_FILE_EXTENSION))
    .map((name) => {
      const filePath = path.join(dir, name);
      const stats = fs.statSync(filePath);
      return {
        name,
        path: filePath,
        sizeMb: stats.size / BYTES_PER_MB,
        createdAt: stats.mtime,
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
};

export const getTotalSizeMb = (files: Array<{ sizeMb: number }>): number => {
  return files.reduce((sum, f) => sum + f.sizeMb, 0);
};

export const cleanupOldBackups = (maxStorageMb: number, now: Date = new Date()): number => {
  removeStaleTmpFiles(getBackupDir(), now);

  const toDelete = selectBackupsToDelete(getBackupFiles(), maxStorageMb, now);
  toDelete.forEach((file) => fs.unlinkSync(file.path));

  return toDelete.length;
};

// The dump goes to a `.tmp` name and is renamed only when complete, so neither
// the file list nor the offsite pull (`*.sql.gz`) ever sees a half-written file.
export const performBackup = async (): Promise<string> => {
  const dir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}${BACKUP_FILE_EXTENSION}`;
  const filePath = path.join(dir, filename);
  const tmpPath = `${filePath}${BACKUP_TMP_SUFFIX}`;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL не задан");
  }

  const pgDumpUrl = stripPrismaParams(databaseUrl);

  // pipefail ensures the pipeline fails if pg_dump fails (not just gzip).
  // Without it, gzip produces a ~20-byte empty file on pg_dump errors.
  try {
    await execAsync(`set -o pipefail; pg_dump "$DATABASE_URL" | gzip > "${tmpPath}"`, {
      timeout: PG_DUMP_TIMEOUT_MS,
      env: { ...process.env, DATABASE_URL: pgDumpUrl },
      shell: "/bin/bash",
    });
  } catch (error) {
    removeIfExists(tmpPath);
    const stderr = (error as { stderr?: string }).stderr?.trim();
    const message = stderr
      ? `Ошибка pg_dump: ${stderr}`
      : `Ошибка pg_dump: ${(error as Error).message}`;
    throw new Error(message);
  }

  try {
    const stats = fs.statSync(tmpPath);
    if (stats.size < MIN_BACKUP_SIZE_BYTES) {
      throw new Error(
        `Бэкап слишком мал (${stats.size} байт) — pg_dump вероятно завершился с ошибкой`
      );
    }
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    removeIfExists(tmpPath);
    throw error;
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
    sizeMb: Math.round((stats.size / BYTES_PER_MB) * 100) / 100,
    createdAt: stats.mtime,
  };
};

// Module-level overlap guard: pg_dump on a large DB can outrun the cron tick
// or hit the execAsync timeout, leaving lastBackupAt unchanged. Without this
// flag the next tick would start a parallel pg_dump and double the load.
let backupRunning = false;

export const runBackupJob = async (): Promise<void> => {
  if (backupRunning) {
    console.warn("runBackupJob: previous backup still running, skipping this tick");
    return;
  }

  backupRunning = true;
  try {
    const settings = await getBackupSettings();

    if (!settings.enabled) {
      return;
    }

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
    const sizeMb = (stats.size / BYTES_PER_MB).toFixed(2);

    console.log(`Backup created: ${path.basename(filePath)} (${sizeMb} MB)`);

    await prisma.backupSettings.update({
      where: { id: settings.id },
      data: { lastBackupAt: new Date() },
    });

    const deletedCount = cleanupOldBackups(settings.maxStorageMb);
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    const err = error as Error;
    console.error("Backup job failed:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    throw error;
  } finally {
    backupRunning = false;
  }
};
