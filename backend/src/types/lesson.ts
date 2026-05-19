export type CreateLessonDto = {
  subject: "MATHEMATICS" | "PHYSICS";
  lessonType: "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";
  description?: string;
  startTime: Date;
  endTime: Date;
  price?: number;
  studentId: string;
  homework?: string;
  notes?: string;
  isRecurring?: boolean; // Регулярное занятие
};

export type UpdateLessonDto = Partial<CreateLessonDto> & {
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
