import type { Student } from "../../../../shared";

export type StudentFormData = {
  name: string;
  contactMethod?: "WHATSAPP" | "TELEGRAM";
  parentPhone?: string;
  parentName?: string;
  parentContactMethod?: "WHATSAPP" | "TELEGRAM";
  telegramNick?: string;
  parentTelegramNick?: string;
  phone: string;
  grade: string;
  notes: string;
};

export type StudentFormProps = {
  open: boolean;
  onClose: () => void;
  student?: Student;
};

export type StudentFormFieldsProps = {
  formData: StudentFormData;
  isMobile: boolean;
  onChange: (
    field: string
  ) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onGradeChange: (value: string) => void;
};

export type StudentFormActionsProps = {
  student?: Student;
  isLoading: boolean;
  isMobile: boolean;
  onClose: () => void;
  onDelete: () => void;
};
