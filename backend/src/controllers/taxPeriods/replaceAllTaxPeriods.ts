import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import type { CreateTaxRatePeriodDto } from "../../types";
import {
  hasDuplicateStartDates,
  normalizeRate,
  validateTaxPeriodInput,
} from "./validators";

type ReplaceAllBody = { periods?: CreateTaxRatePeriodDto[] };

export const replaceAllTaxPeriods = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { periods } = (req.body ?? {}) as ReplaceAllBody;

    if (!Array.isArray(periods)) {
      return res
        .status(400)
        .json({ error: "Поле periods должно быть массивом" });
    }

    for (const p of periods) {
      const error = validateTaxPeriodInput(p);
      if (error) return res.status(400).json({ error });
    }

    if (hasDuplicateStartDates(periods)) {
      return res
        .status(400)
        .json({ error: "Период с такой датой начала уже существует" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { taxEnabled: true },
    });

    if (user?.taxEnabled && periods.length === 0) {
      return res.status(400).json({
        error: "Нельзя удалить последний период при включённом учёте налога",
      });
    }

    const stored = await prisma.$transaction(async (tx) => {
      await tx.taxRatePeriod.deleteMany({ where: { userId } });
      if (periods.length > 0) {
        await tx.taxRatePeriod.createMany({
          data: periods.map((p) => ({
            userId: userId!,
            startDate: new Date(p.startDate),
            rate: normalizeRate(p.rate),
          })),
        });
      }
      return tx.taxRatePeriod.findMany({
        where: { userId },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, rate: true },
      });
    });

    res.json(
      stored.map((p) => ({
        id: p.id,
        startDate: p.startDate.toISOString(),
        rate: p.rate,
      })),
    );
  } catch (error) {
    console.error("Replace tax periods error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
