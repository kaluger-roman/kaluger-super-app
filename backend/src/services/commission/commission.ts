import type { Prisma } from "@prisma/client";
import type { CommissionCredit } from "../../types";
import { isWithinPeriod, loadStudentAllocations, sumAmounts } from "./commission.helpers";
import type {
  CommissionContext,
  CommissionPeriod,
  CommissionStatistics,
  StudentCommissionSummary,
} from "./commission.types";

const EMPTY_SUMMARY: StudentCommissionSummary = { commissionRepaid: 0, commissionRemaining: 0 };

export const buildCommissionContext = async (
  tutorId: string,
  studentIds?: string[]
): Promise<CommissionContext> => {
  const entries = await loadStudentAllocations(tutorId, studentIds);
  const creditByLessonId = new Map<string, CommissionCredit>();
  const summaryByStudentId = new Map<string, StudentCommissionSummary>();

  for (const { student, allocation } of entries) {
    summaryByStudentId.set(student.id, {
      commissionRepaid: allocation.repaid,
      commissionRemaining: allocation.remaining,
    });

    for (const [lessonId, credit] of allocation.creditByLessonId) {
      creditByLessonId.set(lessonId, credit);
    }
  }

  return { creditByLessonId, summaryByStudentId };
};

export const attachCommissionToLessons = async <T extends { id: string; studentId: string | null }>(
  tutorId: string,
  lessons: T[]
): Promise<Array<T & { commissionCredit?: CommissionCredit }>> => {
  const studentIds = [
    ...new Set(lessons.map((lesson) => lesson.studentId).filter((id): id is string => id !== null)),
  ];
  if (studentIds.length === 0) return lessons;

  const { creditByLessonId } = await buildCommissionContext(tutorId, studentIds);
  if (creditByLessonId.size === 0) return lessons;

  return lessons.map((lesson) => {
    const credit = creditByLessonId.get(lesson.id);

    return credit ? { ...lesson, commissionCredit: credit } : lesson;
  });
};

export const attachCommissionToStudents = async <
  T extends { id: string; commissionAmount: Prisma.Decimal },
>(
  tutorId: string,
  students: T[]
): Promise<Array<T & Partial<StudentCommissionSummary>>> => {
  const commissionStudentIds = students
    .filter((student) => student.commissionAmount.toNumber() > 0)
    .map((student) => student.id);
  if (commissionStudentIds.length === 0) return students;

  const { summaryByStudentId } = await buildCommissionContext(tutorId, commissionStudentIds);

  return students.map((student) => ({
    ...student,
    ...EMPTY_SUMMARY,
    ...summaryByStudentId.get(student.id),
  }));
};

export const collectCommissionStatistics = async (
  tutorId: string,
  period: CommissionPeriod
): Promise<CommissionStatistics> => {
  const entries = await loadStudentAllocations(tutorId);

  if (entries.length === 0) {
    return {
      hasCommissionStudents: false,
      commissionWrittenOffSum: 0,
      commissionRemainingTotal: 0,
    };
  }

  const writtenOff: number[] = [];
  const remaining: number[] = [];

  for (const { student, lessons, allocation } of entries) {
    if (!student.archived) {
      remaining.push(allocation.remaining);
    }

    for (const lesson of lessons) {
      const credit = allocation.creditByLessonId.get(lesson.id);
      if (credit?.state === "FACT" && isWithinPeriod(lesson, period)) {
        writtenOff.push(credit.amount);
      }
    }
  }

  return {
    hasCommissionStudents: true,
    commissionWrittenOffSum: sumAmounts(writtenOff),
    commissionRemainingTotal: sumAmounts(remaining),
  };
};

// After a write has already been committed, a failure to enrich the response
// must not turn a successful create/update into a 500 — the client gets the
// saved row without the derived commission fields and refetches them later.
export const tryAttachCommissionToStudents: typeof attachCommissionToStudents = async (
  tutorId,
  students
) => {
  try {
    return await attachCommissionToStudents(tutorId, students);
  } catch (error) {
    console.error("Attach commission to students error:", error);
    return students;
  }
};

export const tryAttachCommissionToLessons: typeof attachCommissionToLessons = async (
  tutorId,
  lessons
) => {
  try {
    return await attachCommissionToLessons(tutorId, lessons);
  } catch (error) {
    console.error("Attach commission to lessons error:", error);
    return lessons;
  }
};
