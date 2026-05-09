import { Response } from "express";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import type { UpdateTaxRatePeriodDto } from "../../types";
import { normalizeRate, validateUpdateTaxPeriod } from "./validators";

export const updateTaxPeriod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const data: UpdateTaxRatePeriodDto = req.body;

    const errors = validateUpdateTaxPeriod(data);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const existing = await prisma.taxRatePeriod.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Период не найден" });
    }

    const updateData: { startDate?: Date; rate?: number } = {};
    if (data.startDate !== undefined) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.rate !== undefined) {
      updateData.rate = normalizeRate(data.rate);
    }

    const period = await prisma.taxRatePeriod.update({
      where: { id },
      data: updateData,
      select: { id: true, startDate: true, rate: true },
    });

    res.json({
      id: period.id,
      startDate: period.startDate.toISOString(),
      rate: period.rate,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(400)
        .json({ error: "Период с такой датой начала уже существует" });
    }
    console.error("Update tax period error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
