import type { Student } from "../../shared";

export type StudentsPageState = {
  isDialogOpen: boolean;
  isViewDialogOpen: boolean;
  editingStudent?: Student;
  viewingStudent?: Student;
  anchorEl: HTMLElement | null;
  selectedStudent: Student | null;
  deleteDialogOpen: Student | null;
};
