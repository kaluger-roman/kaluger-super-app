export const LESSON_STUDENT_INCLUDE = {
  student: { include: { studentUser: { select: { id: true } } } },
} as const;
