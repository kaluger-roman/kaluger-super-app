import type { Response } from "express";
import type { AdminRequest } from "../../types";
import { getOverviewData } from "../../services/admin";

export const getOverview = async (req: AdminRequest, res: Response) => {
  try {
    const data = await getOverviewData();
    res.json(data);
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ error: "Ошибка получения обзора" });
  }
};
