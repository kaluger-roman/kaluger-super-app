import type { Response } from "express";
import type { AdminRequest } from "../../types";
import type { UpdateBackupSettingsDto } from "../../types";
import { updateBackupSettings } from "../../services";

export const updateSettings = async (req: AdminRequest, res: Response) => {
  try {
    const { enabled, intervalHours, maxStorageMb } =
      req.body as UpdateBackupSettingsDto;

    if (intervalHours !== undefined && (intervalHours < 1 || intervalHours > 168)) {
      return res
        .status(400)
        .json({ error: "Интервал должен быть от 1 до 168 часов" });
    }

    if (maxStorageMb !== undefined && (maxStorageMb < 10 || maxStorageMb > 10000)) {
      return res
        .status(400)
        .json({ error: "Максимальный размер должен быть от 10 до 10000 МБ" });
    }

    const settings = await updateBackupSettings({
      enabled,
      intervalHours,
      maxStorageMb,
    });

    res.json({
      enabled: settings.enabled,
      intervalHours: settings.intervalHours,
      maxStorageMb: settings.maxStorageMb,
      lastBackupAt: settings.lastBackupAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error updating backup settings:", error);
    res.status(500).json({ error: "Ошибка обновления настроек бэкапов" });
  }
};
