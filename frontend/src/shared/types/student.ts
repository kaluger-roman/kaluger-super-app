export type ContactMethod = "WHATSAPP" | "TELEGRAM" | "MAX";

export type ArchiveReason =
  | "COMPLETED_STUDIES"
  | "FOUND_ANOTHER_TUTOR"
  | "CHANGED_MIND"
  | "POOR_EFFORT"
  | "MISSED_LESSONS";

export type Student = {
  id: string;
  name: string;
  contactMethod?: ContactMethod;
  parentPhone?: string | null;
  parentName?: string | null;
  parentContactMethod?: ContactMethod | null;
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
  studentUser?: { id: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStudentDto = {
  name: string;
  contactMethod?: ContactMethod;
  parentPhone?: string | null;
  parentName?: string | null;
  parentContactMethod?: ContactMethod | null;
  telegramNick?: string | null;
  parentTelegramNick?: string | null;
  phone?: string | null;
  notes?: string | null;
  hourlyRate?: number | null;
  grade?: number | null;
};

export type UpdateStudentDto = Partial<CreateStudentDto>;
