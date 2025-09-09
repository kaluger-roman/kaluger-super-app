import type { Lesson } from "../../shared";

export type LessonsPageState = {
  currentTab: number;
  isDialogOpen: boolean;
  isViewDialogOpen: boolean;
  isRescheduleDialogOpen: boolean;
  /** Вид отображения уроков: постранично / понедельно / расписание */
  viewMode?: "paged" | "weekly" | "schedule";
  editingLesson?: Lesson;
  viewingLesson?: Lesson;
  reschedulingLesson?: Lesson;
  deleteDialogOpen: boolean;
  selectedLesson: Lesson | null;
};

export type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  action: () => void;
  severity?: "warning" | "error" | "info";
};
