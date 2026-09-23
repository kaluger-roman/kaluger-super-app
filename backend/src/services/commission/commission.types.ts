import type { Prisma } from "@prisma/client";
import type { CommissionAllocation, CommissionCredit, LessonStatus } from "../../types";

export type CommissionStudentRow = {
  id: string;
  commissionAmount: Prisma.Decimal;
  archived: boolean;
};

export type CommissionLessonRow = {
  id: string;
  studentId: string | null;
  startTime: Date;
  price: Prisma.Decimal | null;
  status: LessonStatus;
  isPaid: boolean;
  paymentDate: Date | null;
};

export type StudentCommissionAllocation = {
  student: CommissionStudentRow;
  lessons: CommissionLessonRow[];
  allocation: CommissionAllocation;
};

export type StudentCommissionSummary = {
  commissionRepaid: number;
  commissionRemaining: number;
};

export type CommissionContext = {
  creditByLessonId: Map<string, CommissionCredit>;
  summaryByStudentId: Map<string, StudentCommissionSummary>;
};

export type CommissionPeriod = {
  gte: Date;
  lte: Date;
};

export type CommissionStatistics = {
  hasCommissionStudents: boolean;
  commissionWrittenOffSum: number;
  commissionRemainingTotal: number;
};
