import type { Response } from "express";
import type { AdminAlertsResponse, AdminRequest } from "../../types";
import { listAlerts, markAlertRead as markAlertReadService } from "../../services";
import { AdminAlertNotFoundError } from "../../utils";

export const markAlertRead = async (req: AdminRequest, res: Response) => {
  try {
    await markAlertReadService(req.params.id);
    const response: AdminAlertsResponse = { alerts: await listAlerts() };
    return res.json(response);
  } catch (error) {
    if (error instanceof AdminAlertNotFoundError) {
      return res.status(404).json({ error: "Алерт не найден" });
    }
    console.error("Error marking admin alert read:", error);
    return res.status(500).json({ error: "Ошибка обновления алерта" });
  }
};
