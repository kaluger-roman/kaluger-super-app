import type { FC } from "react";
import { useEffect } from "react";

import { DialogContent, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import { StudentDeleteDialog } from "@shared/ui";

import * as Styled from "./StudentForm.styled";
import { StudentFormActions } from "./StudentFormActions";
import { StudentFormFields } from "./StudentFormFields";
import type { StudentFormProps } from "./types";
import { studentFormModel } from "../../models";


export const StudentForm: FC<StudentFormProps> = ({ open, onClose, student }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const formData = useUnit(studentFormModel.$formData);
  const isLoading = useUnit(studentModel.$isStudentsLoading);
  const deleteDialogOpen = useUnit(studentFormModel.$deleteDialogOpen);

  useEffect(() => {
    if (open) {
      studentFormModel.formOpened(student);
    }
  }, [open, student]);

  const handleChange =
    (field: string) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } }
    ) => {
      const target = (event as { target?: { value?: unknown } }).target;
      const value = target?.value ?? "";
      studentFormModel.fieldChanged({ field, value: String(value) });
    };

  const handleGradeChange = (value: string) => {
    studentFormModel.gradeChanged(value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    studentFormModel.formSubmitted(event);
  };

  const handleDeleteStudent = () => {
    studentFormModel.deleteRequested();
  };

  const handleDeleteConfirm = () => {
    studentFormModel.deleteConfirmed();
  };

  return (
    <Styled.StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      $isMobile={isMobile}
    >
      <form onSubmit={handleSubmit}>
        <Styled.StyledDialogTitle>
          {student ? "Редактировать студента" : "Добавить студента"}
        </Styled.StyledDialogTitle>

        <DialogContent>
          <StudentFormFields
            formData={formData}
            isMobile={isMobile}
            onChange={handleChange}
            onGradeChange={handleGradeChange}
          />
        </DialogContent>

        <Styled.StyledDialogActions>
          <StudentFormActions
            student={student}
            isLoading={isLoading}
            isMobile={isMobile}
            onClose={onClose}
            onDelete={handleDeleteStudent}
          />
        </Styled.StyledDialogActions>
      </form>

      <StudentDeleteDialog
        open={deleteDialogOpen}
        onClose={studentFormModel.deleteDialogClosed}
        onConfirm={handleDeleteConfirm}
        student={student}
      />
    </Styled.StyledDialog>
  );
};
