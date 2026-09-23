import { prisma } from "../../lib/prisma";
import type { CommissionLessonInput } from "../../types";
import { allocateCommission } from "../../utils";
import type {
  CommissionLessonRow,
  CommissionPeriod,
  CommissionStudentRow,
  StudentCommissionAllocation,
} from "./commission.types";

const LESSON_SELECT = {
  id: true,
  studentId: true,
  startTime: true,
  price: true,
  status: true,
  isPaid: true,
  paymentDate: true,
} as const;

const toAmount = (value: { toNumber: () => number } | null) => value?.toNumber() ?? null;

const toAllocatorInput = (lesson: CommissionLessonRow): CommissionLessonInput => ({
  id: lesson.id,
  startTime: lesson.startTime,
  paymentDate: lesson.paymentDate,
  price: toAmount(lesson.price),
  status: lesson.status,
  isPaid: lesson.isPaid,
});

export const findCommissionStudents = (tutorId: string, studentIds?: string[]) =>
  prisma.student.findMany({
    where: {
      tutorId,
      commissionAmount: { gt: 0 },
      ...(studentIds ? { id: { in: studentIds } } : {}),
    },
    select: { id: true, commissionAmount: true, archived: true },
  });

export const groupLessonsByStudent = (lessons: CommissionLessonRow[]) => {
  const byStudentId = new Map<string, CommissionLessonRow[]>();

  for (const lesson of lessons) {
    if (!lesson.studentId) continue;

    const group = byStudentId.get(lesson.studentId);
    if (group) {
      group.push(lesson);
    } else {
      byStudentId.set(lesson.studentId, [lesson]);
    }
  }

  return byStudentId;
};

// No students with a commission means no extra query at all: a tutor who never
// uses commissions must not pay a single request for the feature (FR-003).
export const loadStudentAllocations = async (
  tutorId: string,
  studentIds?: string[]
): Promise<StudentCommissionAllocation[]> => {
  if (studentIds && studentIds.length === 0) return [];

  const students: CommissionStudentRow[] = await findCommissionStudents(tutorId, studentIds);
  if (students.length === 0) return [];

  const lessons = await prisma.lesson.findMany({
    where: { tutorId, studentId: { in: students.map((student) => student.id) } },
    select: LESSON_SELECT,
  });
  const lessonsByStudent = groupLessonsByStudent(lessons);

  return students.map((student) => {
    const studentLessons = lessonsByStudent.get(student.id) ?? [];

    return {
      student,
      lessons: studentLessons,
      allocation: allocateCommission({
        commissionAmount: student.commissionAmount.toNumber(),
        lessons: studentLessons.map(toAllocatorInput),
      }),
    };
  });
};

// A lesson can be flagged paid without a paymentDate (older rows, and the
// manual "оплачено" toggle). Falling back to startTime keeps such a lesson in
// the period it belongs to instead of dropping it out of the figure entirely —
// the same fallback the tax and "поступления за период" helpers already use
// (statistics.helpers.ts: paidInRangeWhere, computeTaxSummary).
export const isWithinPeriod = (lesson: CommissionLessonRow, period: CommissionPeriod) => {
  const effectiveDate = lesson.paymentDate ?? lesson.startTime;

  return effectiveDate >= period.gte && effectiveDate <= period.lte;
};

// Sums are added up in whole kopecks so a long list of two-decimal amounts
// cannot drift away from the exact total.
export const sumAmounts = (amounts: number[]) =>
  amounts.reduce((total, amount) => total + Math.round(amount * 100), 0) / 100;
