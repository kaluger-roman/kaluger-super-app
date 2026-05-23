import type { FC, KeyboardEvent } from "react";
import { useEffect } from "react";

import { Box, DialogContent, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { studentModel } from "@entities";
import { StudentArchivedInfo } from "@shared";
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

  const handleSubmit = () => {
    studentFormModel.formSubmitted();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !isLoading && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      handleSubmit();
    }
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
      <Box onKeyDown={handleKeyDown}>
        <Styled.StyledDialogTitle>
          {student ? (
            <>
              Редактировать студента{" "}
              {student?.archived && student?.archivedAt && (
                <StudentArchivedInfo
                  archivedAt={student.archivedAt}
                  archiveReason={student.archiveReason}
                  archiveComment={student.archiveComment}
                  variant="compact"
                />
              )}
            </>
          ) : (
            "Добавить студента"
          )}
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
            onSubmit={handleSubmit}
          />
        </Styled.StyledDialogActions>
      </Box>

      <StudentDeleteDialog
        open={deleteDialogOpen}
        onClose={studentFormModel.deleteDialogClosed}
        onConfirm={handleDeleteConfirm}
        student={student}
      />
    </Styled.StyledDialog>
  );
};
