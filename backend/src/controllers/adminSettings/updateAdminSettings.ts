import type { Response } from "express";
import type { AdminRequest, AdminSettingsDto, UpdateAdminSettingsDto } from "../../types";
import { updateAdminSettings as updateAdminSettingsService } from "../../services";
import { validateUpdateAdminSettingsDto } from "./validators";

export const updateAdminSettings = async (req: AdminRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as UpdateAdminSettingsDto;
    const validation = validateUpdateAdminSettingsDto({
      alertEmail: body.alertEmail,
      alertEmailEnabled: body.alertEmailEnabled,
    });
    if ("error" in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const { alertEmail, alertEmailEnabled } = await updateAdminSettingsService(validation.data);
    const response: AdminSettingsDto = { alertEmail, alertEmailEnabled };
    return res.json(response);
  } catch (error) {
    console.error("Error updating admin settings:", error);
    return res.status(500).json({ error: "Ошибка сохранения настроек" });
  }
};
