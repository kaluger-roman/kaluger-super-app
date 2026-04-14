import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth";

import { generateScreenToken } from "./helpers";

export const getScreenToken = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const token = generateScreenToken(userId);
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get("host")}`;

    res.json({
      token,
      uploadUrl: `${baseUrl}/api/screen/upload`,
    });
  } catch (error) {
    console.error("Ошибка генерации токена:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};
