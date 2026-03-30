import type { Response } from "express";
import type { AdminRequest } from "../../types";
import { createManualBackup } from "../../services";

export const createBackup = async (req: AdminRequest, res: Response) => {
  try {
    const result = await createManualBackup();

    res.json({
      name: result.name,
      sizeMb: result.sizeMb,
      createdAt: result.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({ error: "Ошибка создания бэкапа" });
  }
};
