import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";

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
          take: 5,
        },
        studentUser: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    return res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
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
        studentUser: { select: { id: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    return res.json({ student });
  } catch (error) {
    console.error("Get student error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
