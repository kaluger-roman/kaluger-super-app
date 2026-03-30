import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";

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
        createdAt: stats.birthtime,
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

  // Удаляем самые старые файлы, пока превышен лимит (оставляем минимум 1)
  const sortedOldestFirst = [...files].reverse();

  for (const file of sortedOldestFirst) {
    if (totalSize <= maxStorageMb || files.length - deletedCount <= 1) break;

    fs.unlinkSync(file.path);
    totalSize -= file.sizeMb;
    deletedCount++;
  }

  return deletedCount;
};

export const performBackup = (): string => {
  const dir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql.gz`;
  const filePath = path.join(dir, filename);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL не задан");
  }

  execSync(`pg_dump "${databaseUrl}" | gzip > "${filePath}"`, {
    stdio: "pipe",
    timeout: 300000, // 5 минут таймаут
  });

  // Проверяем что файл создан и не пуст
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    fs.unlinkSync(filePath);
    throw new Error("Бэкап пуст — pg_dump вернул пустой результат");
  }

  return filePath;
};

export const runBackupJob = async (): Promise<void> => {
  const settings = await getBackupSettings();

  if (!settings.enabled) {
    return;
  }

  // Проверяем, прошло ли достаточно времени с последнего бэкапа
  if (settings.lastBackupAt) {
    const hoursSinceLastBackup =
      (Date.now() - settings.lastBackupAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastBackup < settings.intervalHours) {
      return;
    }
  }

  console.log("Начинаю создание бэкапа базы данных...");

  const filePath = performBackup();
  const stats = fs.statSync(filePath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Бэкап создан: ${path.basename(filePath)} (${sizeMb} MB)`);

  // Обновляем время последнего бэкапа
  await prisma.backupSettings.update({
    where: { id: settings.id },
    data: { lastBackupAt: new Date() },
  });

  // Очищаем старые бэкапы
  const deletedCount = cleanupOldBackups(settings.maxStorageMb);
  if (deletedCount > 0) {
    console.log(`Удалено ${deletedCount} старых бэкапов`);
  }
};
