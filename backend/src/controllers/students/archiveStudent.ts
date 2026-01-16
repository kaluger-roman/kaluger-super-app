import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const archiveStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { archiveReason, archiveComment } = req.body;
    const userId = req.user?.userId;

    const existingStudent = await prisma.student.findFirst({
      where: { id, tutorId: userId },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.lesson.deleteMany({
        where: {
          studentId: id,
          startTime: { gte: new Date() },
        },
      });

      const student = await tx.student.update({
        where: { id },
        data: {
          archived: true,
          archivedAt: new Date(),
          archiveReason: archiveReason || null,
          archiveComment: archiveComment || null,
        },
      });

      return student;
    });

    res.json({ student: result });
  } catch (error) {
    console.error("Archive student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const unarchiveStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existingStudent = await prisma.student.findFirst({
      where: { id, tutorId: userId },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        archived: false,
        archivedAt: null,
        archiveReason: null,
        archiveComment: null,
      },
    });

    res.json({ student });
  } catch (error) {
    console.error("Unarchive student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
