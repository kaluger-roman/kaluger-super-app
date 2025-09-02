import type { Lesson } from "../../../../shared";

export type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  action: () => void;
  severity?: "warning" | "error" | "info";
};

export type LessonViewDialogProps = {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
  onEdit: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onReschedule?: () => void;
  onDelete: () => void;
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
};
