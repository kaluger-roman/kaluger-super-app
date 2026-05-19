import prisma from "../../lib/prisma";
import type { StudentLessonsByWeekResponse } from "../../types";
import { addDays, parseWeekStart } from "../../utils/time";
import { toStudentLessonResponse } from "./studentCabinet.helpers";

export const getStudentLessonsByWeek = async (
  studentUserId: string,
  weekStartRaw?: string
): Promise<StudentLessonsByWeekResponse> => {
  const weekStart = parseWeekStart(weekStartRaw);
  const weekEnd = addDays(weekStart, 7);

  const studentUser = await prisma.studentUser.findUnique({
    where: { id: studentUserId },
    select: { studentId: true },
  });

  if (!studentUser?.studentId) {
    return { weekStart: weekStart.toISOString(), lessons: [] };
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      studentId: studentUser.studentId,
      startTime: { gte: weekStart, lt: weekEnd },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      subject: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  return {
    weekStart: weekStart.toISOString(),
    lessons: lessons.map(toStudentLessonResponse),
  };
};

// Резолвит studentUserId по lessonId — для WS-broadcast.
// Возвращает null если у урока нет связи с зарегистрированным аккаунтом.
export const getStudentUserIdByLessonId = async (
  lessonId: string
): Promise<string | null> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      student: { select: { studentUser: { select: { id: true } } } },
    },
  });
  return lesson?.student?.studentUser?.id ?? null;
};

export { toStudentLessonResponse as toStudentLessonPayload } from "./studentCabinet.helpers";
