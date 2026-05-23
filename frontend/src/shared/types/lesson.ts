import type { Student } from "./student";

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
  studentId: string;
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
  studentId: string;
  homework?: string;
  notes?: string;
  isRecurring?: boolean;
};

export type UpdateLessonDto = Partial<CreateLessonDto> & {
  isPaid?: boolean;
  paymentDate?: string;
  isHomeworkSentByTeacher?: boolean;
  grade?: number;
  status?: LessonStatus;
};
