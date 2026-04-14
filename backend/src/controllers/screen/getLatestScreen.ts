import type { Response } from "express";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

import type { AuthRequest } from "../../middleware/auth";

const UPLOADS_DIR = join(__dirname, "../../../uploads/screens");

export const getLatestScreen = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const filePath = join(UPLOADS_DIR, `${userId}.jpg`);

    if (!existsSync(filePath)) {
      return res.json({ hasImage: false, image: null, updatedAt: null });
    }

    const stats = statSync(filePath);
    const imageBuffer = readFileSync(filePath);
    const base64 = imageBuffer.toString("base64");

    res.json({
      hasImage: true,
      image: `data:image/jpeg;base64,${base64}`,
      updatedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    console.error("Ошибка получения скриншота:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};
