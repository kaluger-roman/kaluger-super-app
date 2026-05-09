import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const deleteTaxPeriod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const existing = await prisma.taxRatePeriod.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Период не найден" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { taxEnabled: true },
    });

    if (user?.taxEnabled) {
      const count = await prisma.taxRatePeriod.count({
        where: { userId },
      });
      if (count <= 1) {
        return res.status(400).json({
          error: "Нельзя удалить последний период при включённом учёте налога",
        });
      }
    }

    await prisma.taxRatePeriod.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error("Delete tax period error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
