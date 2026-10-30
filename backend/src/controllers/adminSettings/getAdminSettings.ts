import type { Response } from "express";
import type { AdminRequest, AdminSettingsDto } from "../../types";
import { getAdminSettings as getAdminSettingsService } from "../../services";

export const getAdminSettings = async (req: AdminRequest, res: Response) => {
  try {
    const { alertEmail, alertEmailEnabled } = await getAdminSettingsService();
    const response: AdminSettingsDto = { alertEmail, alertEmailEnabled };
    res.json(response);
  } catch (error) {
    console.error("Error getting admin settings:", error);
    res.status(500).json({ error: "Ошибка получения настроек" });
  }
};
