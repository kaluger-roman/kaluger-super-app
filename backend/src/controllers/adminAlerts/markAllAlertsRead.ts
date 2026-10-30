import type { Response } from "express";
import type { AdminAlertsResponse, AdminRequest } from "../../types";
import { listAlerts, markAllAlertsRead as markAllAlertsReadService } from "../../services";

export const markAllAlertsRead = async (req: AdminRequest, res: Response) => {
  try {
    await markAllAlertsReadService();
    const response: AdminAlertsResponse = { alerts: await listAlerts() };
    res.json(response);
  } catch (error) {
    console.error("Error marking all admin alerts read:", error);
    res.status(500).json({ error: "Ошибка обновления алертов" });
  }
};
