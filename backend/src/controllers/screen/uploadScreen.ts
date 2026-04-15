import type { Request, Response } from "express";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

import { getWebSocketManager } from "../../lib/wsManager";

import { verifyScreenToken } from "./helpers";

const UPLOADS_DIR = join(__dirname, "../../../uploads/screens");

export const uploadScreen = (req: Request, res: Response) => {
  try {
    const token = req.headers["x-screen-token"] as string | undefined;
    if (!token) {
      return res.status(400).json({ error: "Токен не предоставлен" });
    }

    const userId = verifyScreenToken(token);
    if (!userId) {
      return res.status(403).json({ error: "Недействительный токен" });
    }

    const imageData = req.body as Buffer;
    if (!imageData || !Buffer.isBuffer(imageData) || imageData.length === 0) {
      return res.status(400).json({ error: "Изображение не предоставлено" });
    }

    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const filePath = join(UPLOADS_DIR, `${userId}.jpg`);
    writeFileSync(filePath, imageData);

    const wsManager = getWebSocketManager();
    if (wsManager) {
      const base64 = imageData.toString("base64");
      wsManager.sendToUser(userId, {
        type: "screen_updated",
        image: `data:image/jpeg;base64,${base64}`,
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка загрузки скриншота:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};
