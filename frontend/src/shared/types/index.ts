export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Student = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  hourlyRate?: number | null;
  grade?: number | null; // Класс от 1 до 11
  createdAt: string;
  updatedAt: string;
  lessons?: Lesson[];
};

export type Lesson = {
  id: string;
  subject: Subject;
  lessonType: LessonType;
  description?: string;
  startTime: string;
  endTime: string;
  price?: number;
  isPaid: boolean;
  homework?: string;
  notes?: string;
  grade?: number;
  status: LessonStatus;
  isRecurring?: boolean; // Регулярное занятие
  recurringParentId?: string; // ID родительского регулярного урока
  createdAt: string;
  updatedAt: string;
  studentId: string;
  student?: Pick<Student, "id" | "name" | "email">;
};

export type LessonStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "IN_PROGRESS";

export type Subject = "MATHEMATICS" | "PHYSICS";

export type LessonType = "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";

export const SUBJECT_LABELS: Record<Subject, string> = {
  MATHEMATICS: "Математика",
  PHYSICS: "Физика",
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  EGE: "ЕГЭ",
  OGE: "ОГЭ",
  OLYMPICS: "Олимпиады",
  SCHOOL: "Школа",
};

export type CreateStudentDto = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  hourlyRate?: number | null;
  grade?: number | null; // Класс от 1 до 11
};

export type UpdateStudentDto = Partial<CreateStudentDto>;

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
  isRecurring?: boolean; // Регулярное занятие
};

export type UpdateLessonDto = Partial<CreateLessonDto> & {
  isPaid?: boolean;
  grade?: number;
  status?: LessonStatus;
};

export type AuthRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = AuthRequest & {
  name: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Statistics = {
  completedLessons: number;
  cancelledLessons: number;
  totalLessons: number;
  upcomingLessons: number;
  earnings: number;
  lastMonthEarnings: number;
  lostEarnings: number;
};

// Re-export date formatting functions for convenience
export {
  formatDate,
  formatDateTime,
  formatTime,
  formatDuration,
} from "../lib/date";
