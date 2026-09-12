import type { ContactMethod, Student } from "@shared";

export type StudentFormData = {
  name: string;
  contactMethod?: ContactMethod;
  parentPhone?: string;
  parentName?: string;
  parentContactMethod?: ContactMethod;
  telegramNick?: string;
  parentTelegramNick?: string;
  phone: string;
  hourlyRate: string;
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
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } }
  ) => void;
  onGradeChange: (value: string) => void;
};

export type StudentFormActionsProps = {
  student?: Student;
  isLoading: boolean;
  isMobile: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSubmit: () => void;
};
