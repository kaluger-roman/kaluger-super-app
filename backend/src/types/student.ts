export type CreateStudentDto = {
  name: string;
  contactMethod: "WHATSAPP" | "TELEGRAM";
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
