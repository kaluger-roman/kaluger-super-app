import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";
import { tryAttachCommissionToStudents } from "../../services";

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

    res.json({ students: await tryAttachCommissionToStudents(userId!, students) });
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
        studentUser: { select: { id: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    const [studentWithCommission] = await tryAttachCommissionToStudents(userId!, [student]);

    res.json({ student: studentWithCommission });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
