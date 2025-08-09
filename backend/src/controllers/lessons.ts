import { Response } from "express";
import { CreateLessonDto, UpdateLessonDto } from "../types";
import { AuthRequest } from "../middleware/auth";
import { getWebSocketManager } from "../lib/wsManager";
import prisma from "../lib/prisma";

export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      startDate,
      endDate,
      studentId,
      status,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tutorId: userId };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (status && typeof status === "string") {
      // Support multiple statuses separated by comma
      const statuses = status.split(",").map((s: string) => s.trim());
      if (statuses.length > 1) {
        where.status = { in: statuses };
      } else {
        where.status = status;
      }
    }

    const [lessons, total] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.lesson.count({ where }),
    ]);

    res.json({
      lessons,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get lessons error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const lesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
      include: {
        student: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    res.json({ lesson });
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      subject,
      lessonType,
      description,
      startTime,
      endTime,
      price,
      studentId,
      homework,
      notes,
      isRecurring,
    }: CreateLessonDto = req.body;

    // Validation
    if (!subject || !lessonType || !startTime || !endTime || !studentId) {
      return res.status(400).json({
        error:
          "Предмет, тип урока, время начала, время окончания и ID студента обязательны",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res
        .status(400)
        .json({ error: "Время окончания должно быть позже времени начала" });
    }

    const now = new Date();
    now.setSeconds(0, 0); // Убираем секунды и миллисекунды для точности
    if (start < now) {
      return res.status(400).json({
        error: "Время начала должно быть в будущем",
      });
    }

    if (price && price < 0) {
      return res.status(400).json({ error: "Цена должна быть положительной" });
    }

    // Check if student belongs to user
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        tutorId: userId,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Студент не найден" });
    }

    if (isRecurring) {
      // Создаем регулярные уроки на 3 месяца вперед
      const lessons = [];
      const threeMonthsLater = new Date(start);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      let currentStart = new Date(start);
      let currentEnd = new Date(end);

      while (currentStart <= threeMonthsLater) {
        // Check for scheduling conflicts
        const conflicts = await prisma.lesson.findMany({
          where: {
            tutorId: userId,
            status: {
              not: "CANCELLED",
            },
            OR: [
              {
                startTime: {
                  lt: currentEnd,
                },
                endTime: {
                  gt: currentStart,
                },
              },
            ],
          },
        });

        if (conflicts.length === 0) {
          const lessonData = {
            subject,
            lessonType,
            description:
              currentStart.getTime() === start.getTime()
                ? description
                : undefined,
            startTime: currentStart,
            endTime: currentEnd,
            price: price || student.hourlyRate,
            homework:
              currentStart.getTime() === start.getTime() ? homework : undefined,
            notes:
              currentStart.getTime() === start.getTime() ? notes : undefined,
            isRecurring: true,
            tutorId: userId!,
            studentId,
          };

          lessons.push(lessonData);
        }

        // Move to next week
        currentStart = new Date(
          currentStart.getTime() + 7 * 24 * 60 * 60 * 1000
        );
        currentEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      if (lessons.length === 0) {
        return res.status(400).json({
          error:
            "Невозможно создать регулярные уроки из-за конфликтов в расписании",
        });
      }

      // Create all lessons
      const createdLessons = await prisma.lesson.createMany({
        data: lessons,
      });

      // Get the first lesson to return
      const firstLesson = await prisma.lesson.findFirst({
        where: {
          tutorId: userId,
          startTime: start,
          studentId,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        lesson: firstLesson,
        message: `Создано ${createdLessons.count} регулярных уроков`,
      });

      // Отправляем WebSocket уведомление о статусе урока
      const wsManager = getWebSocketManager();
      if (wsManager && firstLesson) {
        wsManager.broadcastLessonStatusUpdate(
          firstLesson.id,
          firstLesson.status,
          userId!
        );
      }
    } else {
      // Check for scheduling conflicts for single lesson
      const conflicts = await prisma.lesson.findMany({
        where: {
          tutorId: userId,
          status: {
            not: "CANCELLED",
          },
          OR: [
            {
              startTime: {
                lt: end,
              },
              endTime: {
                gt: start,
              },
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        return res.status(400).json({
          error: "Временной слот конфликтует с существующим уроком",
        });
      }

      const lesson = await prisma.lesson.create({
        data: {
          subject,
          lessonType,
          description,
          startTime: start,
          endTime: end,
          price: price || student.hourlyRate,
          homework,
          notes,
          isRecurring: false,
          tutorId: userId!,
          studentId,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({ lesson });

      // Отправляем WebSocket уведомление о статусе урока
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          lesson.status,
          userId!
        );
      }
    }
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const updateData: UpdateLessonDto = req.body;

    // Check if lesson exists and belongs to user
    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingLesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    // Validation for time updates
    if (updateData.startTime || updateData.endTime) {
      const start = updateData.startTime
        ? new Date(updateData.startTime)
        : existingLesson.startTime;
      const end = updateData.endTime
        ? new Date(updateData.endTime)
        : existingLesson.endTime;

      if (start >= end) {
        return res
          .status(400)
          .json({ error: "Время окончания должно быть позже времени начала" });
      }

      // Check for scheduling conflicts (excluding current lesson)
      const conflictingLesson = await prisma.lesson.findFirst({
        where: {
          id: { not: id },
          tutorId: userId,
          status: { not: "CANCELLED" },
          OR: [
            {
              startTime: {
                lt: end,
              },
              endTime: {
                gt: start,
              },
            },
          ],
        },
      });

      if (conflictingLesson) {
        return res
          .status(409)
          .json({ error: "Временной слот конфликтует с существующим уроком" });
      }
    }

    if (updateData.price && updateData.price < 0) {
      return res.status(400).json({ error: "Цена должна быть положительной" });
    }

    if (updateData.grade && (updateData.grade < 1 || updateData.grade > 5)) {
      return res.status(400).json({ error: "Оценка должна быть от 1 до 5" });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      message: "Урок успешно обновлен",
      lesson,
    });

    // Отправляем WebSocket уведомление о статусе урока только если статус изменился
    if (updateData.status && updateData.status !== existingLesson.status) {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(
          lesson.id,
          lesson.status,
          userId!
        );
      }
    }
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deleteAllFuture } = req.body;
    const userId = req.user?.userId;

    // Check if lesson exists and belongs to user
    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        tutorId: userId,
      },
    });

    if (!existingLesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    if (deleteAllFuture && existingLesson.isRecurring) {
      // Delete all future recurring lessons with the same pattern
      const now = new Date();

      await prisma.lesson.deleteMany({
        where: {
          tutorId: userId,
          studentId: existingLesson.studentId,
          subject: existingLesson.subject,
          lessonType: existingLesson.lessonType,
          isRecurring: true,
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
      });

      res.json({
        message: "Все будущие регулярные уроки успешно удалены",
      });
    } else {
      await prisma.lesson.delete({
        where: { id },
      });

      res.json({ message: "Урок успешно удален" });
    }
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

export const getUpcomingLessons = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const now = new Date();

    const lessons = await prisma.lesson.findMany({
      where: {
        tutorId: userId,
        startTime: {
          gte: now,
        },
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({ lessons });
  } catch (error) {
    console.error("Get upcoming lessons error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
