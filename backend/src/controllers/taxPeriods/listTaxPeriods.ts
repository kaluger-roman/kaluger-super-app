import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const listTaxPeriods = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const periods = await prisma.taxRatePeriod.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
      select: { id: true, startDate: true, rate: true },
    });

    res.json(
      periods.map((period) => ({
        id: period.id,
        startDate: period.startDate.toISOString(),
        rate: period.rate,
      })),
    );
  } catch (error) {
    console.error("List tax periods error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
