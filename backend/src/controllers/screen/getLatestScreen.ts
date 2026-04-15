import type { Response } from "express";
import { existsSync, statSync } from "fs";
import { join, resolve } from "path";

import type { AuthRequest } from "../../middleware/auth";

const UPLOADS_DIR = resolve(__dirname, "../../../uploads/screens");

export const getLatestScreen = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const filePath = join(UPLOADS_DIR, `${userId}.jpg`);

    if (!existsSync(filePath)) {
      return res.status(204).send();
    }

    const stats = statSync(filePath);
    res.set("X-Updated-At", stats.mtime.toISOString());
    res.type("image/jpeg");
    res.sendFile(filePath);
  } catch (error) {
    console.error("Ошибка получения скриншота:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};
