export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Student = {
  id: string;
  name: string;
  contactMethod?: "WHATSAPP" | "TELEGRAM";
  parentPhone?: string | null;
  parentName?: string | null;
  parentContactMethod?: "WHATSAPP" | "TELEGRAM" | null;
  telegramNick?: string | null;
  parentTelegramNick?: string | null;
  phone?: string | null;
  notes?: string | null;
  hourlyRate?: number | null;
  grade?: number | null; // Класс от 1 до 11
  archived: boolean;
  archivedAt?: string | null;
  archiveReason?: ArchiveReason | null;
  archiveComment?: string | null;
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
  paymentDate?: string;
  isHomeworkSentByTeacher?: boolean;
  homework?: string;
  notes?: string;
  grade?: number;
  status: LessonStatus;
  isRecurring?: boolean; // Регулярное занятие
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

export type LessonStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "IN_PROGRESS";

export type Subject = "MATHEMATICS" | "PHYSICS";

export type LessonType = "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";

export type ArchiveReason =
  | "COMPLETED_STUDIES"
  | "FOUND_ANOTHER_TUTOR"
  | "CHANGED_MIND"
  | "POOR_EFFORT"
  | "MISSED_LESSONS";

export type CreateStudentDto = {
  name: string;
  contactMethod?: "WHATSAPP" | "TELEGRAM";
  parentPhone?: string | null;
  parentName?: string | null;
  parentContactMethod?: "WHATSAPP" | "TELEGRAM" | null;
  telegramNick?: string | null;
  parentTelegramNick?: string | null;
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
  paymentDate?: string;
  isHomeworkSentByTeacher?: boolean;
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
  upcomingLessons: number;
  totalLessons: number;
  earnings: number;
  lastMonthEarnings: number;
  lostEarnings: number;
  upcomingIncome?: number;
  prepaidIncome?: number;
  unpaidDebtSum?: number;
  unpaidDebtCount?: number;
  unpaidDebtOver24hSum?: number;
  unpaidDebtOver24hCount?: number;
  trialLessonsCount?: number;
};
