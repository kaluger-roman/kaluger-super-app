export type CreateUserDto = {
  email: string;
  password: string;
  name: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type CreateStudentDto = {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  hourlyRate?: number;
  grade?: number; // Класс от 1 до 11
};

export type UpdateStudentDto = Partial<CreateStudentDto>;

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
  grade?: number;
  status?:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "IN_PROGRESS";
};

export type JwtPayload = {
  userId: string;
  email: string;
};
