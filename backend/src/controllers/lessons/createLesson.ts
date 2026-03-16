import { Response } from "express";
import { CreateLessonDto } from "../../types";
import { AuthRequest } from "../../middleware/auth";
import { getWebSocketManager } from "../../lib/wsManager";
import prisma from "../../lib/prisma";
import { validateLessonData, checkSchedulingConflicts } from "./validators";
import { truncateToMinute } from "../../utils/time";
import { scheduleRemindersForLesson } from "../../services/reminderScheduler";
import type { Student } from "@prisma/client";
import type { LessonStatus, Prisma } from "@prisma/client";

const createSingleLesson = async (
  userId: string,
  data: CreateLessonDto,
  student: Student,
  res: Response
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

  const conflicts = await checkSchedulingConflicts(userId, start, end, prisma);
  if (conflicts.length > 0) {
    return res
      .status(400)
      .json({ error: "Временной слот конфликтует с существующим уроком" });
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
      ...(computedStatus ? { status: computedStatus } : {}),
      isRecurring: false,
      tutorId: userId,
      studentId,
    },
    include: { student: true },
  });

  res.status(201).json({ lesson });

  // Schedule reminders for the new lesson
  if (lesson.status === "SCHEDULED") {
    scheduleRemindersForLesson(lesson.id).catch((err) =>
      console.error("Failed to schedule reminders:", err)
    );
  }

  const wsManager = getWebSocketManager();
  if (wsManager) {
    wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
  }
};

const createRecurringLessons = async (
  userId: string,
  data: CreateLessonDto,
  student: Student,
  res: Response
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

  const lessons: Prisma.LessonCreateManyInput[] = [];
  const threeMonthsLater = truncateToMinute(new Date(start));
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  let currentStart = truncateToMinute(new Date(start));
  let currentEnd = truncateToMinute(new Date(end));

  while (currentStart <= threeMonthsLater) {
    const conflicts = await checkSchedulingConflicts(
      userId,
      currentStart,
      currentEnd,
      prisma
    );
    if (conflicts.length === 0) {
      const lessonData: Prisma.LessonCreateManyInput = {
        subject,
        lessonType,
        description:
          currentStart.getTime() === start.getTime() ? description : undefined,
        startTime: truncateToMinute(currentStart),
        endTime: truncateToMinute(currentEnd),
        price: price || student.hourlyRate,
        homework:
          currentStart.getTime() === start.getTime() ? homework : undefined,
        notes: currentStart.getTime() === start.getTime() ? notes : undefined,
        isRecurring: true,
        tutorId: userId,
        studentId,
      };
      lessons.push(lessonData);
    }

    currentStart = truncateToMinute(
      new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
    currentEnd = truncateToMinute(
      new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
  }

  if (lessons.length === 0) {
    return res.status(400).json({
      error:
        "Невозможно создать регулярные уроки из-за конфликтов в расписании",
    });
  }

  const createdLessons = await prisma.lesson.createMany({ data: lessons });

  const firstLesson = await prisma.lesson.findFirst({
    where: { tutorId: userId, startTime: start, studentId },
    include: { student: true },
  });

  res.status(201).json({
    lesson: firstLesson,
    message: `Создано ${createdLessons.count} регулярных уроков`,
  });

  // Schedule reminders for all new recurring lessons (scoped to exact created startTimes)
  const createdStartTimes = lessons.map((l) => l.startTime as Date);
  const newLessons = await prisma.lesson.findMany({
    where: {
      tutorId: userId,
      studentId,
      isRecurring: true,
      status: "SCHEDULED",
      startTime: { in: createdStartTimes },
    },
  });
  for (const l of newLessons) {
    scheduleRemindersForLesson(l.id).catch((err) =>
      console.error("Failed to schedule reminders for recurring lesson:", err)
    );
  }

  const wsManager = getWebSocketManager();
  if (wsManager && firstLesson) {
    wsManager.broadcastLessonStatusUpdate(
      firstLesson.id,
      firstLesson.status,
      userId
    );
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
