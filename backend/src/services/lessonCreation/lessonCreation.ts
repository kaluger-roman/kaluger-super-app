import type { Lesson, Prisma, Student } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getWebSocketManager } from "../../lib/wsManager";
import type { CreateLessonDto } from "../../types";
import { SchedulingConflictError } from "../../utils";
import { truncateToMinute } from "../../utils/time";
import { scheduleRemindersForLesson } from "../reminderScheduler";
import { broadcastStudentLessonCreated } from "../studentLessonBroadcast";
import {
  buildRecurringSlots,
  checkSchedulingConflicts,
  computeLessonStatus,
} from "./lessonCreation.helpers";
import type {
  CreatedRecurringLessons,
  LessonWithStudent,
} from "./lessonCreation.types";

export const createSingleLesson = (
  userId: string,
  data: CreateLessonDto,
  student: Student | null,
): Promise<LessonWithStudent> => {
  const start = truncateToMinute(new Date(data.startTime));
  const end = truncateToMinute(new Date(data.endTime));
  const computedStatus = computeLessonStatus(
    start,
    end,
    truncateToMinute(new Date()),
  );
  const lessonPrice = student
    ? (data.price ?? student.hourlyRate)
    : (data.price ?? 0);

  return prisma.$transaction(async (tx) => {
    const conflicts = await checkSchedulingConflicts(userId, start, end, tx);
    if (conflicts.length > 0) {
      throw new SchedulingConflictError(
        "Временной слот конфликтует с существующим уроком",
      );
    }
    return tx.lesson.create({
      data: {
        subject: data.subject,
        lessonType: data.lessonType,
        description: data.description,
        startTime: start,
        endTime: end,
        price: lessonPrice,
        homework: data.homework,
        notes: data.notes,
        ...(computedStatus ? { status: computedStatus } : {}),
        isRecurring: false,
        tutorId: userId,
        studentId: data.studentId ?? null,
        prospectName: data.prospectName?.trim() ?? null,
        prospectPhone: data.prospectPhone ?? null,
        prospectContactMethod: data.prospectContactMethod ?? null,
      },
      include: { student: true },
    });
  });
};

export const createRecurringLessons = (
  userId: string,
  data: CreateLessonDto,
  student: Student,
): Promise<CreatedRecurringLessons> => {
  const start = truncateToMinute(new Date(data.startTime));
  const end = truncateToMinute(new Date(data.endTime));
  const lessonPrice = data.price ?? student.hourlyRate;
  const candidateSlots = buildRecurringSlots(start, end);

  return prisma.$transaction(async (tx) => {
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
          subject: data.subject,
          lessonType: data.lessonType,
          description: slot.isFirst ? data.description : undefined,
          startTime: slot.start,
          endTime: slot.end,
          price: lessonPrice,
          homework: slot.isFirst ? data.homework : undefined,
          notes: slot.isFirst ? data.notes : undefined,
          isRecurring: true,
          tutorId: userId,
          studentId: data.studentId,
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
};

export const notifyLessonsCreated = (
  userId: string,
  lessons: Lesson[],
  primary: Lesson | null,
) => {
  for (const lesson of lessons) {
    if (lesson.status === "SCHEDULED") {
      scheduleRemindersForLesson(lesson.id).catch((err) =>
        console.error("Failed to schedule reminders:", err),
      );
    }
  }

  const wsManager = getWebSocketManager();
  if (wsManager && primary) {
    wsManager.broadcastLessonStatusUpdate(primary.id, primary.status, userId);
  }

  for (const lesson of lessons) {
    void broadcastStudentLessonCreated(lesson);
  }
};
