import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { getBackupSettings, getBackupFiles, getTotalSizeMb } from "../../services";

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await getBackupSettings();
    const files = getBackupFiles();

    res.json({
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
      totalSizeMb: Math.round(getTotalSizeMb(files) * 100) / 100,
    });
  } catch (error) {
    console.error("Error getting backup settings:", error);
    res.status(500).json({ error: "Ошибка получения настроек бэкапов" });
  }
};
