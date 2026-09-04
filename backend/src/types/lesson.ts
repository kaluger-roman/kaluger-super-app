import type { ContactMethod } from "./student";

export type CreateLessonDto = {
  subject: "MATHEMATICS" | "PHYSICS";
  lessonType: "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";
  description?: string;
  startTime: Date;
  endTime: Date;
  price?: number;
  studentId?: string;
  prospectName?: string;
  prospectPhone?: string;
  prospectContactMethod?: ContactMethod;
  homework?: string;
  notes?: string;
  isRecurring?: boolean; // Регулярное занятие
};

export type UpdateLessonDto = Omit<
  Partial<CreateLessonDto>,
  "description" | "homework" | "notes"
> & {
  // Explicit null clears the field — Prisma treats `undefined` as "no change",
  // so a note cleared in the edit form would otherwise survive the update.
  description?: string | null;
  homework?: string | null;
  notes?: string | null;
  isPaid?: boolean;
  // Allow explicit `null` so we can clear paymentDate on cancellation. Prisma
  // treats `undefined` as "no change", so without `null` paymentDate would
  // silently stay set when isPaid flips to false.
  paymentDate?: Date | null;
  isHomeworkSentByTeacher?: boolean;
  grade?: number;
  status?:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "IN_PROGRESS";
};

export type ShiftResult = {
  shifted: number;
  shiftedIds?: string[];
  conflicts?: Array<{ lessonId: string; conflictingLessonId: string }>;
};

export type LessonSlot = {
  startTime: Date;
  endTime: Date;
};
