import { Response } from "express";
import { CreateStudentDto } from "../../types";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { handlePrismaError } from "../../utils/prismaErrorHandler";
import { validateCreateStudentDto } from "./validators";

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: CreateStudentDto = req.body;

    // Validation
    const validationErrors = validateCreateStudentDto(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    const student = await prisma.student.create({
      data: {
        name: data.name,
        telegramNick: data.telegramNick || null,
        contactMethod: data.contactMethod,
        parentPhone: data.parentPhone || null,
        parentName: data.parentName || null,
        parentTelegramNick: data.parentTelegramNick || null,
        parentContactMethod: data.parentContactMethod || null,
        phone: data.phone,
        grade: data.grade,
        notes: data.notes,
        tutorId: userId!,
      },
    });

    res.status(201).json({
      message: "Ученик успешно создан",
      student,
    });
  } catch (error) {
    console.error("Create student error:", error);

    if (handlePrismaError(error, res)) {
      return;
    }

    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
