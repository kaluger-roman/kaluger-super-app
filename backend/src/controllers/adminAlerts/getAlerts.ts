import type { Response } from "express";
import type { AdminAlertsResponse, AdminRequest } from "../../types";
import { listAlerts } from "../../services";

export const getAlerts = async (req: AdminRequest, res: Response) => {
  try {
    const response: AdminAlertsResponse = { alerts: await listAlerts() };
    res.json(response);
  } catch (error) {
    console.error("Error getting admin alerts:", error);
    res.status(500).json({ error: "Ошибка получения алертов" });
  }
};
