import React from "react";
import { Container, Typography, Box, Fab, Paper } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useUnit } from "effector-react";
import { $students, $studentsIsLoading } from "../../entities";
import { Loading } from "../../shared";
import { StudentDeleteDialog } from "../../shared/ui";
import { StudentForm, StudentViewDialog } from "../../features/students";
import { useStudentsPage } from "./useStudentsPage";
import { StudentsList, StudentsMenu, EmptyStudentsState } from "./components";

export const StudentsPage: React.FC = () => {
  const students = useUnit($students);
  const isLoading = useUnit($studentsIsLoading);

  const {
    state,
    handleMenuClick,
    handleMenuClose,
    handleEditFromMenu,
    handleDeleteFromMenu,
    handleDeleteConfirm,
    handleStudentClick,
    handleCloseViewDialog,
    handleEditFromView,
    handleDeleteFromView,
    handleCloseEditDialog,
    handleAddStudent,
    handleCloseDeleteDialog,
  } = useStudentsPage();

  if (isLoading && students.length === 0) {
    return <Loading message="Загрузка студентов..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          👥 Ученики
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Управление вашими учениками
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        {students.length === 0 ? (
          <EmptyStudentsState />
        ) : (
          <StudentsList
            students={students}
            onStudentClick={handleStudentClick}
            onMenuClick={handleMenuClick}
          />
        )}
      </Paper>

      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
        }}
        onClick={handleAddStudent}
      >
        <AddIcon sx={{ fontSize: 28 }} />
      </Fab>

      <StudentForm
        open={state.isDialogOpen}
        onClose={handleCloseEditDialog}
        student={state.editingStudent}
      />

      <StudentViewDialog
        open={state.isViewDialogOpen}
        onClose={handleCloseViewDialog}
        student={state.viewingStudent}
        onEdit={handleEditFromView}
        onDelete={handleDeleteFromView}
      />

      <StudentDeleteDialog
        open={Boolean(state.deleteDialogOpen)}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteConfirm}
        student={state.deleteDialogOpen || undefined}
      />

      <StudentsMenu
        anchorEl={state.anchorEl}
        onClose={handleMenuClose}
        onEdit={handleEditFromMenu}
        onDelete={handleDeleteFromMenu}
      />
    </Container>
  );
};
