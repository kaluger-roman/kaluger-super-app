import { Response } from "express";
import { UpdateStudentDto } from "../../types";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { handlePrismaError } from "../../utils/prismaErrorHandler";
import { validateUpdateStudentDto, prepareUpdateData } from "./validators";

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const updateData: UpdateStudentDto = req.body;

    // Validation
    const validationErrors = validateUpdateStudentDto(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Check if student exists and belongs to user
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    // Prepare update data - convert empty strings to null for optional fields
    const preparedData = prepareUpdateData(updateData);

    const student = await prisma.student.update({
      where: { id },
      data: preparedData,
    });

    res.json({
      message: "Ученик успешно обновлен",
      student,
    });
  } catch (error) {
    console.error("Update student error:", error);

    if (handlePrismaError(error, res)) {
      return;
    }

    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
