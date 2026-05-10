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

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Cancel pending reminders for the future lessons we're about to delete.
      // Without this, the cron processor can still fire push for an already
      // deleted lesson if it claimed the reminder seconds before this delete.
      // Limit to the same status set we delete below to keep history of
      // CANCELLED/COMPLETED future entries.
      await tx.scheduledReminder.updateMany({
        where: {
          lesson: {
            studentId: id,
            startTime: { gte: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      });

      // Only delete still-active future lessons. CANCELLED/COMPLETED future
      // entries are kept so the historical record (including cancellation
      // reasons and any payments tied to them) survives archival.
      await tx.lesson.deleteMany({
        where: {
          studentId: id,
          startTime: { gte: now },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
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
