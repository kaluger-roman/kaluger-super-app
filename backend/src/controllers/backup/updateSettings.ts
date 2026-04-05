import type { Response } from "express";
import type { AdminRequest, UpdateBackupSettingsDto } from "../../types";
import { updateBackupSettings } from "../../services";
import { validateUpdateBackupSettingsDto } from "./validators";

export const updateSettings = async (req: AdminRequest, res: Response) => {
  try {
    const { enabled, intervalHours, maxStorageMb } =
      req.body as UpdateBackupSettingsDto;

    const errors = validateUpdateBackupSettingsDto({
      enabled,
      intervalHours,
      maxStorageMb,
    });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
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
