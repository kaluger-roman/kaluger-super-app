import type { Response } from "express";
import type { AdminRequest, BackupSettingsFullResponse } from "../../types";
import {
  MIN_RETENTION_DAYS,
  getBackupFiles,
  getBackupSettings,
  getOffsiteStatus,
  getTotalSizeMb,
  isStorageLimitExceeded,
} from "../../services";

export const getSettings = async (req: AdminRequest, res: Response) => {
  try {
    const settings = await getBackupSettings();
    const files = getBackupFiles();
    const totalSizeMb = getTotalSizeMb(files);

    const response: BackupSettingsFullResponse = {
      settings: {
        enabled: settings.enabled,
        intervalHours: settings.intervalHours,
        maxStorageMb: settings.maxStorageMb,
        lastBackupAt: settings.lastBackupAt?.toISOString() ?? null,
      },
      files: files.map((f) => ({
        name: f.name,
        sizeMb: Math.round(f.sizeMb * 100) / 100,
        createdAt: f.createdAt.toISOString(),
      })),
      totalSizeMb: Math.round(totalSizeMb * 100) / 100,
      minRetentionDays: MIN_RETENTION_DAYS,
      storageLimitExceeded: isStorageLimitExceeded(files, settings.maxStorageMb, new Date()),
      offsite: getOffsiteStatus(),
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting backup settings:", error);
    res.status(500).json({ error: "Ошибка получения настроек бэкапов" });
  }
};
