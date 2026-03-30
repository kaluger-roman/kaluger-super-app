import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { performBackup, cleanupOldBackups, getBackupSettings } from "../../services";
import fs from "fs";
import path from "path";
import prisma from "../../lib/prisma";

export const createBackup = async (req: AuthRequest, res: Response) => {
  try {
    const filePath = performBackup();
    const stats = fs.statSync(filePath);
    const sizeMb = Math.round((stats.size / (1024 * 1024)) * 100) / 100;

    const settings = await getBackupSettings();

    await prisma.backupSettings.update({
      where: { id: settings.id },
      data: { lastBackupAt: new Date() },
    });

    cleanupOldBackups(settings.maxStorageMb);

    res.json({
      name: path.basename(filePath),
      sizeMb,
      createdAt: stats.birthtime.toISOString(),
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({ error: "Ошибка создания бэкапа" });
  }
};
