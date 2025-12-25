import type { Lesson } from "@shared";

export type LessonFormData = {
  subject: string;
  lessonType: string;
  description: string;
  startTime: Date;
  endTime: Date;
  price: string;
  studentId: string;
  homework: string;
  notes: string;
  isRecurring: boolean;
  isPaid: boolean;
  isHomeworkSentByTeacher: boolean;
};

export type LessonFormProps = {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
};

export type ConfirmDialogData = {
  open: boolean;
  title: string;
  message: string;
  action: () => void;
};
