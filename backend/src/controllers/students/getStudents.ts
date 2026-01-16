import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { archived } = req.query;

    const archivedFilter = archived === "true";

    const students = await prisma.student.findMany({
      where: {
        tutorId: userId,
        archived: archivedFilter,
      },
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
      return res.status(404).json({ error: "Ученик не найден" });
    }

    res.json({ student });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
