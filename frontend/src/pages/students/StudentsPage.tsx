import type { FC } from "react";

import { Add as AddIcon } from "@mui/icons-material";
import { Typography, Tabs, Tab, Box } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { studentModel } from "@entities";
import {
  StudentForm,
  StudentViewDialog,
  studentsModel,
  StudentArchiveDialog,
  StudentUnarchiveDialog,
} from "@features/students";
import { StudentDeleteDialog } from "@shared/ui";

import { StudentsList, StudentsMenu, EmptyStudentsState } from "./components";
import * as Styled from "./StudentsPage.styled";

export const StudentsPage: FC = () => {
  useGate(studentsModel.StudentsPageGate);

  const activeStudents = useUnit(studentModel.$students);
  const archivedStudents = useUnit(studentModel.$archivedStudents);
  const isLoading = useUnit(studentModel.$isStudentsLoading);
  const isDialogOpen = useUnit(studentsModel.$isDialogOpen);
  const isViewDialogOpen = useUnit(studentsModel.$isViewDialogOpen);
  const anchorEl = useUnit(studentsModel.$anchorEl);
  const deleteDialogStudent = useUnit(studentsModel.$deleteDialogStudent);
  const editingStudent = useUnit(studentsModel.$editingStudent);
  const viewingStudent = useUnit(studentsModel.$viewingStudent);
  const currentTab = useUnit(studentsModel.$currentTab);

  const students = currentTab === 1 ? archivedStudents : activeStudents;

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
        <Box>
          <Tabs value={currentTab} onChange={(_, value) => studentsModel.tabChanged(value)}>
            <Tab label="Активные" />
            <Tab label="Архив" />
          </Tabs>
        </Box>

        {students.length === 0 ? (
          <EmptyStudentsState isArchiveTab={currentTab === 1} />
        ) : (
          <StudentsList students={students} />
        )}
      </Styled.StyledPaper>

      <Styled.StyledFab
        color="primary"
        aria-label="Добавить ученика"
        onClick={() => studentsModel.dialogOpened(undefined)}
      >
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

      <StudentArchiveDialog />
      <StudentUnarchiveDialog />

      <StudentsMenu
        anchorEl={anchorEl}
        onClose={studentsModel.menuClosed}
        onEdit={studentsModel.editFromMenuRequested}
        onDelete={studentsModel.deleteFromMenuRequested}
      />
    </Styled.StyledContainer>
  );
};
