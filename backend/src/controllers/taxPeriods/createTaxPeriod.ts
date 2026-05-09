import { Response } from "express";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import type { CreateTaxRatePeriodDto } from "../../types";
import { normalizeRate, validateCreateTaxPeriod } from "./validators";

export const createTaxPeriod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: CreateTaxRatePeriodDto = req.body;

    const errors = validateCreateTaxPeriod(data);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const period = await prisma.taxRatePeriod.create({
      data: {
        userId: userId!,
        startDate: new Date(data.startDate),
        rate: normalizeRate(data.rate),
      },
      select: { id: true, startDate: true, rate: true },
    });

    res.status(201).json({
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
    console.error("Create tax period error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
