import type { Response } from "express";
import type { CreateLessonDto } from "../../types";
import type { AuthRequest } from "../../middleware/auth";
import { getWebSocketManager } from "../../lib/wsManager";
import prisma from "../../lib/prisma";
import { validateLessonData, checkSchedulingConflicts } from "./validators";
import { truncateToMinute } from "../../utils/time";
import {
  broadcastStudentLessonCreated,
  scheduleRemindersForLesson,
} from "../../services";
import type { Student } from "@prisma/client";
import type { LessonStatus, Prisma } from "@prisma/client";

class SchedulingConflictError extends Error {}

const createSingleLesson = async (
  userId: string,
  data: CreateLessonDto,
  student: Student,
  res: Response,
): Promise<Response | void> => {
  const {
    subject,
    lessonType,
    description,
    startTime,
    endTime,
    price,
    homework,
    notes,
    studentId,
  } = data;

  const start = truncateToMinute(new Date(startTime));
  const end = truncateToMinute(new Date(endTime));

  let computedStatus: LessonStatus | undefined = undefined;
  const now = truncateToMinute(new Date());
  if (end.getTime() <= now.getTime()) {
    computedStatus = "COMPLETED";
  } else if (
    start.getTime() <= now.getTime() &&
    end.getTime() > now.getTime()
  ) {
    computedStatus = "IN_PROGRESS";
  }

  const lessonPrice = price ?? student.hourlyRate;

  let lesson;
  try {
    lesson = await prisma.$transaction(async (tx) => {
      const conflicts = await checkSchedulingConflicts(userId, start, end, tx);
      if (conflicts.length > 0) {
        throw new SchedulingConflictError(
          "Временной слот конфликтует с существующим уроком",
        );
      }
      return tx.lesson.create({
        data: {
          subject,
          lessonType,
          description,
          startTime: start,
          endTime: end,
          price: lessonPrice,
          homework,
          notes,
          ...(computedStatus ? { status: computedStatus } : {}),
          isRecurring: false,
          tutorId: userId,
          studentId,
        },
        include: { student: true },
      });
    });
  } catch (err) {
    if (err instanceof SchedulingConflictError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  res.status(201).json({ lesson });

  // Schedule reminders for the new lesson
  if (lesson.status === "SCHEDULED") {
    scheduleRemindersForLesson(lesson.id).catch((err) =>
      console.error("Failed to schedule reminders:", err),
    );
  }

  const wsManager = getWebSocketManager();
  if (wsManager) {
    wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
  }

  void broadcastStudentLessonCreated(lesson);
};

const createRecurringLessons = async (
  userId: string,
  data: CreateLessonDto,
  student: Student,
  res: Response,
): Promise<Response | void> => {
  const {
    subject,
    lessonType,
    description,
    startTime,
    endTime,
    price,
    homework,
    notes,
    studentId,
  } = data;

  const start = truncateToMinute(new Date(startTime));
  const end = truncateToMinute(new Date(endTime));

  const lessonPrice = price ?? student.hourlyRate;
  const candidateSlots: Array<{ start: Date; end: Date; isFirst: boolean }> =
    [];
  const threeMonthsLater = truncateToMinute(new Date(start));
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  let currentStart = truncateToMinute(new Date(start));
  let currentEnd = truncateToMinute(new Date(end));

  while (currentStart <= threeMonthsLater) {
    candidateSlots.push({
      start: truncateToMinute(currentStart),
      end: truncateToMinute(currentEnd),
      isFirst: currentStart.getTime() === start.getTime(),
    });
    currentStart = truncateToMinute(
      new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
    currentEnd = truncateToMinute(
      new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
  }

  let createdLessons: Awaited<
    ReturnType<typeof prisma.lesson.createManyAndReturn>
  >;
  let firstLesson: Awaited<ReturnType<typeof prisma.lesson.findFirst>>;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const slotsToCreate: Prisma.LessonCreateManyInput[] = [];
      for (const slot of candidateSlots) {
        const conflicts = await checkSchedulingConflicts(
          userId,
          slot.start,
          slot.end,
          tx,
        );
        if (conflicts.length === 0) {
          slotsToCreate.push({
            subject,
            lessonType,
            description: slot.isFirst ? description : undefined,
            startTime: slot.start,
            endTime: slot.end,
            price: lessonPrice,
            homework: slot.isFirst ? homework : undefined,
            notes: slot.isFirst ? notes : undefined,
            isRecurring: true,
            tutorId: userId,
            studentId,
          });
        }
      }

      if (slotsToCreate.length === 0) {
        throw new SchedulingConflictError(
          "Невозможно создать регулярные уроки из-за конфликтов в расписании",
        );
      }

      const created = await tx.lesson.createManyAndReturn({
        data: slotsToCreate,
      });
      const first = await tx.lesson.findFirst({
        where: { id: created[0]?.id },
        include: { student: true },
      });
      return { created, first };
    });
    createdLessons = result.created;
    firstLesson = result.first;
  } catch (err) {
    if (err instanceof SchedulingConflictError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  res.status(201).json({
    lesson: firstLesson,
    message: `Создано ${createdLessons.length} регулярных уроков`,
  });

  // Schedule reminders for all new recurring lessons (using exact IDs from createManyAndReturn)
  for (const l of createdLessons) {
    if (l.status === "SCHEDULED") {
      scheduleRemindersForLesson(l.id).catch((err) =>
        console.error(
          "Failed to schedule reminders for recurring lesson:",
          err,
        ),
      );
    }
  }

  const wsManager = getWebSocketManager();
  if (wsManager && firstLesson) {
    wsManager.broadcastLessonStatusUpdate(
      firstLesson.id,
      firstLesson.status,
      userId,
    );
  }

  for (const l of createdLessons) {
    void broadcastStudentLessonCreated(l);
  }
};

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: CreateLessonDto = req.body;

    const validation = validateLessonData(data);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: data.studentId,
        tutorId: userId,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Ученик не найден" });
    }

    if (data.isRecurring) {
      await createRecurringLessons(userId!, data, student, res);
    } else {
      await createSingleLesson(userId!, data, student, res);
    }
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
