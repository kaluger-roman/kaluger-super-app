import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const getReminderSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    let settings = await prisma.reminderSettings.findUnique({
      where: { userId: userId! },
    });

    // Lazy creation — create default settings if none exist
    if (!settings) {
      settings = await prisma.reminderSettings.create({
        data: {
          userId: userId!,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });
    }

    res.json({
      enabled: settings.enabled,
      intervals: settings.intervals,
      muteWhenInLesson: settings.muteWhenInLesson,
    });
  } catch (error) {
    console.error("Get reminder settings error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
