import React from "react";
import { Container, Typography, Box } from "@mui/material";
import { ViewModeToggle } from "./components/ViewModeToggle";
import { useUnit } from "effector-react";
import {
  $upcomingLessons,
  $completedLessons,
  $cancelledLessons,
  $completedPagination,
  $cancelledPagination,
  $upcomingPagination,
  $lessonsIsLoading,
} from "../../entities";
import { useLessonsPage } from "./useLessonsPage";
import {
  LessonsTabs,
  AddLessonFab,
  LessonsContent,
  LessonsDialogs,
} from "./components";

export const LessonsPage: React.FC = () => {
  const upcomingLessons = useUnit($upcomingLessons);
  const completedLessons = useUnit($completedLessons);
  const cancelledLessons = useUnit($cancelledLessons);
  const upcomingPagination = useUnit($upcomingPagination);
  const completedPagination = useUnit($completedPagination);
  const cancelledPagination = useUnit($cancelledPagination);
  const isLoading = useUnit($lessonsIsLoading);

  const {
    state,
    setState,
    confirmDialog,
    setConfirmDialog,
    handleTabChange,
    handleCompletedPageChange,
    handleCancelledPageChange,
    handleUpcomingPageChange,
    handleEditLesson,
    handleDeleteLesson,
    handleDeleteConfirm,
    handleCancelLesson,
    handleRestoreLesson,
    handleRescheduleLesson,
    handleRescheduleConfirm,
    handlePaymentChange,
    handleHomeworkSentChange,
    handleCardClick,
  } = useLessonsPage();

  const handleCloseDialog = () => {
    setState((prev) => ({
      ...prev,
      isDialogOpen: false,
      editingLesson: undefined,
    }));
  };

  const handleCloseViewDialog = () => {
    setState((prev) => ({
      ...prev,
      isViewDialogOpen: false,
      viewingLesson: undefined,
    }));
  };

  const handleCloseRescheduleDialog = () => {
    setState((prev) => ({
      ...prev,
      isRescheduleDialogOpen: false,
      reschedulingLesson: undefined,
    }));
  };

  const handleCloseDeleteDialog = () => {
    setState((prev) => ({
      ...prev,
      deleteDialogOpen: false,
      selectedLesson: null,
    }));
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  const handleEditFromView = () => {
    if (state.viewingLesson) {
      setState((prev) => ({
        ...prev,
        isViewDialogOpen: false,
        editingLesson: state.viewingLesson,
        isDialogOpen: true,
      }));
    }
  };

  const handleCancelFromView = () => {
    if (state.viewingLesson) {
      setState((prev) => ({ ...prev, isViewDialogOpen: false }));
      handleCancelLesson(state.viewingLesson);
    }
  };

  const handleRestoreFromView = () => {
    if (state.viewingLesson) {
      setState((prev) => ({ ...prev, isViewDialogOpen: false }));
      handleRestoreLesson(state.viewingLesson);
    }
  };

  const handleRescheduleFromView = () => {
    if (state.viewingLesson) {
      setState((prev) => ({ ...prev, isViewDialogOpen: false }));
      handleRescheduleLesson(state.viewingLesson);
    }
  };

  const handleDeleteFromView = () => {
    if (state.viewingLesson) {
      handleDeleteLesson(state.viewingLesson);
    }
  };

  const handleAddLesson = () => {
    setState((prev) => ({
      ...prev,
      editingLesson: undefined,
      isDialogOpen: true,
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={1}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          📅 Уроки
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Управление расписанием и занятиями
        </Typography>
        <Box mt={2}>
          <ViewModeToggle />
        </Box>
      </Box>

      <LessonsTabs
        currentTab={state.currentTab}
        onTabChange={handleTabChange}
      />

      <LessonsContent
        currentTab={state.currentTab}
        upcomingLessons={upcomingLessons}
        completedLessons={completedLessons}
        cancelledLessons={cancelledLessons}
        upcomingPagination={upcomingPagination}
        completedPagination={completedPagination}
        cancelledPagination={cancelledPagination}
        onEdit={handleEditLesson}
        onDelete={handleDeleteLesson}
        onCancel={handleCancelLesson}
        onRestore={handleRestoreLesson}
        onReschedule={handleRescheduleLesson}
        onPaymentChange={handlePaymentChange}
        onHomeworkSentChange={handleHomeworkSentChange}
        onCardClick={handleCardClick}
        onUpcomingPageChange={handleUpcomingPageChange}
        onCompletedPageChange={handleCompletedPageChange}
        onCancelledPageChange={handleCancelledPageChange}
      />

      <AddLessonFab onClick={handleAddLesson} />

      <LessonsDialogs
        state={state}
        confirmDialog={confirmDialog}
        isLoading={isLoading}
        onCloseDialog={handleCloseDialog}
        onCloseViewDialog={handleCloseViewDialog}
        onCloseRescheduleDialog={handleCloseRescheduleDialog}
        onCloseDeleteDialog={handleCloseDeleteDialog}
        onCloseConfirmDialog={handleCloseConfirmDialog}
        onEditFromView={handleEditFromView}
        onCancelFromView={handleCancelFromView}
        onRestoreFromView={handleRestoreFromView}
        onRescheduleFromView={handleRescheduleFromView}
        onDeleteFromView={handleDeleteFromView}
        onPaymentChange={handlePaymentChange}
        onHomeworkSentChange={handleHomeworkSentChange}
        onDeleteConfirm={handleDeleteConfirm}
        onRescheduleConfirm={handleRescheduleConfirm}
        onConfirmAction={confirmDialog.action}
      />
    </Container>
  );
};
