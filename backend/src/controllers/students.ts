import { Request, Response } from "express";
import { CreateStudentDto, UpdateStudentDto } from "../types";
import { AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const students = await prisma.student.findMany({
      where: { tutorId: userId },
      include: {
        lessons: {
          orderBy: { startTime: "desc" },
          take: 5, // Last 5 lessons
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const student = await prisma.student.findFirst({
      where: {
        id,
        tutorId: userId,
      },
      include: {
        lessons: {
          orderBy: { startTime: "desc" },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Студент не найден" });
    }

    res.json({ student });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, email, phone, notes, hourlyRate }: CreateStudentDto =
      req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: "Имя обязательно для заполнения" });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Неверный формат email" });
    }

    if (hourlyRate && hourlyRate < 0) {
      return res
        .status(400)
        .json({ error: "Почасовая ставка должна быть положительной" });
    }

    const student = await prisma.student.create({
      data: {
        name,
        email,
        phone,
        notes,
        hourlyRate,
        tutorId: userId!,
      },
    });

    res.status(201).json({
      message: "Студент успешно создан",
      student,
    });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const updateData: UpdateStudentDto = req.body;

    // Validation
    if (
      updateData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)
    ) {
      return res.status(400).json({ error: "Неверный формат email" });
    }

    if (updateData.hourlyRate && updateData.hourlyRate < 0) {
      return res
        .status(400)
        .json({ error: "Почасовая ставка должна быть положительной" });
    }

    // Check if student exists and belongs to user
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Студент не найден" });
    }

    // Prepare update data - convert empty strings to null for optional fields
    const preparedData: any = { ...updateData };

    if ("email" in updateData) {
      preparedData.email = updateData.email === "" ? null : updateData.email;
    }
    if ("phone" in updateData) {
      preparedData.phone = updateData.phone === "" ? null : updateData.phone;
    }
    if ("notes" in updateData) {
      preparedData.notes = updateData.notes === "" ? null : updateData.notes;
    }
    if ("hourlyRate" in updateData) {
      preparedData.hourlyRate =
        updateData.hourlyRate === null || updateData.hourlyRate === undefined
          ? null
          : updateData.hourlyRate;
    }
    if ("grade" in updateData) {
      preparedData.grade =
        updateData.grade === null || updateData.grade === undefined
          ? null
          : updateData.grade;
    }

    const student = await prisma.student.update({
      where: { id },
      data: preparedData,
    });

    res.json({
      message: "Студент успешно обновлен",
      student,
    });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Check if student exists and belongs to user
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Студент не найден" });
    }

    await prisma.student.delete({
      where: { id },
    });

    res.json({ message: "Студент успешно удален" });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
