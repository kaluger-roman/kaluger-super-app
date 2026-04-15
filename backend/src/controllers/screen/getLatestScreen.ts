import type { Response } from "express";
import { existsSync, statSync } from "fs";
import { join, resolve } from "path";

import type { AuthRequest } from "../../middleware/auth";

const UPLOADS_DIR = resolve(__dirname, "../../../uploads/screens");

const FORMATS = ["webp", "jpg"] as const;

export const getLatestScreen = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    for (const ext of FORMATS) {
      const filePath = join(UPLOADS_DIR, `${userId}.${ext}`);
      if (existsSync(filePath)) {
        const stats = statSync(filePath);
        res.set("X-Updated-At", stats.mtime.toISOString());
        res.type(ext === "webp" ? "image/webp" : "image/jpeg");
        return res.sendFile(filePath);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error("Ошибка получения скриншота:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};
