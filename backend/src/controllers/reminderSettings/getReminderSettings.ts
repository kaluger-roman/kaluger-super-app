import type { Response } from "express";
import { Prisma } from "@prisma/client";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const getReminderSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Lazy creation. Prisma's `upsert` in 6.13 does a select-then-insert and
    // is NOT atomic under concurrency: two parallel first-requests can both
    // see "no row" and both attempt to INSERT, the loser surfaces P2002.
    // Catch the unique-constraint loss and read the row the winner inserted.
    let settings;
    try {
      settings = await prisma.reminderSettings.upsert({
        where: { userId: userId! },
        update: {},
        create: {
          userId: userId!,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        settings = await prisma.reminderSettings.findUniqueOrThrow({
          where: { userId: userId! },
        });
      } else {
        throw err;
      }
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
