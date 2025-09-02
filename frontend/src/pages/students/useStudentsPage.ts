import { useState, useEffect } from "react";
import { removeStudent, closeStudentDialog } from "../../entities";
import type { Student } from "../../shared";
import type { StudentsPageState } from "./types";

export const useStudentsPage = () => {
  const [state, setState] = useState<StudentsPageState>({
    isDialogOpen: false,
    isViewDialogOpen: false,
    anchorEl: null,
    selectedStudent: null,
    deleteDialogOpen: null,
  });

  // Подписываемся на событие закрытия диалога
  useEffect(() => {
    const unsubscribe = closeStudentDialog.watch(() => {
      setState({
        isDialogOpen: false,
        isViewDialogOpen: false,
        editingStudent: undefined,
        viewingStudent: undefined,
        anchorEl: null,
        selectedStudent: null,
        deleteDialogOpen: null,
      });
    });
    return unsubscribe;
  }, []);

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    student: Student
  ) => {
    event.stopPropagation();
    setState((prev) => ({
      ...prev,
      anchorEl: event.currentTarget,
      selectedStudent: student,
    }));
  };

  const handleMenuClose = () => {
    setState((prev) => ({
      ...prev,
      anchorEl: null,
      selectedStudent: null,
    }));
  };

  const handleEditFromMenu = () => {
    if (state.selectedStudent) {
      setState((prev) => ({
        ...prev,
        editingStudent: state.selectedStudent!,
        isDialogOpen: true,
        anchorEl: null,
        selectedStudent: null,
      }));
    }
  };

  const handleDeleteFromMenu = () => {
    if (state.selectedStudent) {
      setState((prev) => ({
        ...prev,
        deleteDialogOpen: state.selectedStudent,
        anchorEl: null,
        selectedStudent: null,
      }));
    }
  };

  const handleDeleteConfirm = () => {
    // When delete dialog is opened, the student to delete is stored in `deleteDialogOpen`.
    // Fallback to `selectedStudent` for safety.
    const studentToDelete = state.deleteDialogOpen || state.selectedStudent;
    if (studentToDelete) {
      removeStudent(studentToDelete.id);
      // Close the delete dialog and clear selection
      setState((prev) => ({
        ...prev,
        deleteDialogOpen: null,
        selectedStudent: null,
      }));
    }
  };

  const handleStudentClick = (student: Student) => {
    setState((prev) => ({
      ...prev,
      viewingStudent: student,
      isViewDialogOpen: true,
    }));
  };

  const handleCloseViewDialog = () => {
    setState((prev) => ({
      ...prev,
      isViewDialogOpen: false,
      viewingStudent: undefined,
    }));
  };

  const handleEditFromView = () => {
    if (state.viewingStudent) {
      setState((prev) => ({
        ...prev,
        editingStudent: state.viewingStudent!,
        isDialogOpen: true,
        isViewDialogOpen: false,
        viewingStudent: undefined,
      }));
    }
  };

  const handleDeleteFromView = () => {
    if (state.viewingStudent) {
      removeStudent(state.viewingStudent.id);
    }
  };

  const handleCloseEditDialog = () => {
    setState((prev) => ({
      ...prev,
      isDialogOpen: false,
      editingStudent: undefined,
    }));
  };

  const handleAddStudent = () => {
    setState((prev) => ({
      ...prev,
      isDialogOpen: true,
      editingStudent: undefined,
    }));
  };

  const handleCloseDeleteDialog = () => {
    setState((prev) => ({
      ...prev,
      deleteDialogOpen: null,
    }));
  };

  return {
    state,
    setState,
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
  };
};
