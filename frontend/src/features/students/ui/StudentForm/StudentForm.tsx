import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { StudentDeleteDialog } from "../../../../shared/ui";
import { StudentFormFields } from "./StudentFormFields";
import { StudentFormActions } from "./StudentFormActions";
import { useStudentForm } from "./useStudentForm";
import type { StudentFormProps } from "./types";

export const StudentForm: React.FC<StudentFormProps> = ({
  open,
  onClose,
  student,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    formData,
    isLoading,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleChange,
    handleGradeChange,
    handleSubmit,
    handleDeleteStudent,
    handleDeleteConfirm,
  } = useStudentForm(student, onClose, open);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? "100vh" : "90vh",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 2 }}>
          {student ? "Редактировать студента" : "Добавить студента"}
        </DialogTitle>

        <DialogContent>
          <StudentFormFields
            formData={formData}
            isMobile={isMobile}
            onChange={handleChange}
            onGradeChange={handleGradeChange}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <StudentFormActions
            student={student}
            isLoading={isLoading}
            isMobile={isMobile}
            onClose={onClose}
            onDelete={handleDeleteStudent}
          />
        </DialogActions>
      </form>

      <StudentDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        student={student}
      />
    </Dialog>
  );
};
