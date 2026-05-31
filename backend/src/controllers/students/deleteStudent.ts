import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const result = await prisma.student.deleteMany({
      where: { id, tutorId: userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    res.json({ message: "Ученик успешно удален" });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
