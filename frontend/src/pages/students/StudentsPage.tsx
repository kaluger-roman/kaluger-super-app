import type { FC } from "react";

import { Add as AddIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { studentModel } from "@entities";
import { StudentForm, StudentViewDialog, studentsModel } from "@features/students";
import { StudentDeleteDialog } from "@shared/ui";

import { StudentsList, StudentsMenu, EmptyStudentsState } from "./components";
import * as Styled from "./StudentsPage.styled";

export const StudentsPage: FC = () => {
  useGate(studentsModel.StudentsPageGate);

  const students = useUnit(studentModel.$students);
  const isLoading = useUnit(studentModel.$isStudentsLoading);
  const isDialogOpen = useUnit(studentsModel.$isDialogOpen);
  const isViewDialogOpen = useUnit(studentsModel.$isViewDialogOpen);
  const anchorEl = useUnit(studentsModel.$anchorEl);
  const deleteDialogStudent = useUnit(studentsModel.$deleteDialogStudent);
  const editingStudent = useUnit(studentsModel.$editingStudent);
  const viewingStudent = useUnit(studentsModel.$viewingStudent);

  if (isLoading && students.length === 0) {
    return null;
  }

  return (
    <Styled.StyledContainer maxWidth="xl">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h3" component="h1" gutterBottom>
          👥 Ученики
        </Styled.StyledTitle>
        <Typography variant="h6" color="text.secondary">
          Управление вашими учениками
        </Typography>
      </Styled.HeaderBox>

      <Styled.StyledPaper>
        {students.length === 0 ? <EmptyStudentsState /> : <StudentsList students={students} />}
      </Styled.StyledPaper>

      <Styled.StyledFab color="primary" onClick={() => studentsModel.dialogOpened(undefined)}>
        <AddIcon />
      </Styled.StyledFab>

      <StudentForm
        open={isDialogOpen}
        onClose={studentsModel.dialogClosed}
        student={editingStudent}
      />

      <StudentViewDialog open={isViewDialogOpen} student={viewingStudent} />

      <StudentDeleteDialog
        open={Boolean(deleteDialogStudent)}
        onClose={studentsModel.deleteDialogClosed}
        onConfirm={studentsModel.deleteConfirmed}
        student={deleteDialogStudent || undefined}
      />

      <StudentsMenu
        anchorEl={anchorEl}
        onClose={studentsModel.menuClosed}
        onEdit={studentsModel.editFromMenuRequested}
        onDelete={studentsModel.deleteFromMenuRequested}
      />
    </Styled.StyledContainer>
  );
};
