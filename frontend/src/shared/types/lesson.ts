import type { ContactMethod, Student } from "./student";

export type LessonStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "IN_PROGRESS";

export type Subject = "MATHEMATICS" | "PHYSICS";

export type LessonType = "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";

export type Lesson = {
  id: string;
  subject: Subject;
  lessonType: LessonType;
  description?: string;
  startTime: string;
  endTime: string;
  price?: number;
  isPaid: boolean;
  paymentDate?: string;
  isHomeworkSentByTeacher?: boolean;
  homework?: string;
  notes?: string;
  grade?: number;
  status: LessonStatus;
  isRecurring?: boolean;
  createdAt: string;
  updatedAt: string;
  studentId: string | null;
  prospectName?: string | null;
  prospectPhone?: string | null;
  prospectContactMethod?: ContactMethod | null;
  student?: Pick<
    Student,
    | "id"
    | "name"
    | "phone"
    | "contactMethod"
    | "parentPhone"
    | "parentContactMethod"
    | "archived"
    | "archivedAt"
    | "archiveReason"
    | "archiveComment"
  >;
};

export type CreateLessonDto = {
  subject: Subject;
  lessonType: LessonType;
  description?: string;
  startTime: string;
  endTime: string;
  price?: number;
  studentId?: string;
  prospectName?: string;
  prospectPhone?: string;
  prospectContactMethod?: ContactMethod;
  homework?: string;
  notes?: string;
  isRecurring?: boolean;
};

export type UpdateLessonDto = Omit<
  Partial<CreateLessonDto>,
  "description" | "homework" | "notes"
> & {
  // Explicit null clears a text field on the server: `undefined` is dropped
  // during JSON serialization, and Prisma treats a missing field as "no
  // change" — a cleared note would silently survive the update.
  description?: string | null;
  homework?: string | null;
  notes?: string | null;
  isPaid?: boolean;
  paymentDate?: string;
  isHomeworkSentByTeacher?: boolean;
  grade?: number;
  status?: LessonStatus;
};
