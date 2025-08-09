import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Fab,
  Tabs,
  Tab,
  Pagination,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useStore } from "effector-react";
import {
  $upcomingLessons,
  $completedLessons,
  $completedPagination,
  $lessonsIsLoading,
  loadCompletedLessons,
  removeLesson,
  updateLesson,
} from "../../entities";
import {
  Loading,
  Lesson,
  LessonDeleteDialog,
  LessonsList,
  RescheduleDialog,
} from "../../shared";
import { ConfirmDialog } from "../../shared/ui";
import { useNotifications } from "../../shared/lib";
import { LessonForm, LessonViewDialog } from "../../features/lessons";

export const LessonsPage: React.FC = () => {
  const upcomingLessons = useStore($upcomingLessons);
  const completedLessons = useStore($completedLessons);
  const completedPagination = useStore($completedPagination);
  const isLoading = useStore($lessonsIsLoading);
  const { showSuccess } = useNotifications();

  const [currentTab, setCurrentTab] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();
  const [viewingLesson, setViewingLesson] = useState<Lesson | undefined>();
  const [reschedulingLesson, setReschedulingLesson] = useState<
    Lesson | undefined
  >();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Load completed lessons when switching to completed tab
  useEffect(() => {
    if (currentTab === 1) {
      loadCompletedLessons({ page: 1, limit: 50 });
    }
  }, [currentTab]);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
    severity?: "warning" | "error" | "info";
  }>({
    open: false,
    title: "",
    message: "",
    action: () => {},
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCompletedPageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    loadCompletedLessons({ page, limit: 50 });
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsDialogOpen(true);
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (deleteAllFuture?: boolean) => {
    if (!selectedLesson) return;

    await removeLesson({
      id: selectedLesson.id,
      deleteAllFuture,
    });

    // Reload completed lessons if we're on the completed tab
    if (currentTab === 1) {
      loadCompletedLessons({ page: completedPagination.page, limit: 50 });
    }

    setDeleteDialogOpen(false);
    setSelectedLesson(null);
  };

  const handleCancelLesson = (lesson: Lesson) => {
    setConfirmDialog({
      open: true,
      title: "Отменить урок",
      message: "Вы уверены, что хотите отменить этот урок?",
      action: () => {
        updateLesson({
          id: lesson.id,
          data: { status: "CANCELLED" },
        });
        showSuccess("Урок отменен");
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      severity: "warning",
    });
  };

  const handleRestoreLesson = (lesson: Lesson) => {
    setConfirmDialog({
      open: true,
      title: "Восстановить урок",
      message: "Вы уверены, что хотите восстановить этот урок?",
      action: () => {
        updateLesson({
          id: lesson.id,
          data: { status: "SCHEDULED" },
        });
        showSuccess("Урок восстановлен");
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      severity: "info",
    });
  };

  const handleRescheduleLesson = (lesson: Lesson) => {
    setReschedulingLesson(lesson);
    setIsRescheduleDialogOpen(true);
  };

  const handleRescheduleConfirm = async (
    newStartTime: Date,
    newEndTime: Date
  ) => {
    if (!reschedulingLesson) return;

    try {
      await updateLesson({
        id: reschedulingLesson.id,
        data: {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          status: "RESCHEDULED",
        },
      });
      showSuccess("Урок перенесен");
      setIsRescheduleDialogOpen(false);
      setReschedulingLesson(undefined);
    } catch (error) {
      console.error("Reschedule lesson error:", error);
    }
  };

  const handleCloseRescheduleDialog = () => {
    setIsRescheduleDialogOpen(false);
    setReschedulingLesson(undefined);
  };

  const handlePaymentChange = (lessonId: string, isPaid: boolean) => {
    updateLesson({
      id: lessonId,
      data: { isPaid },
    });
    showSuccess(
      isPaid ? "Урок отмечен как оплаченный" : "Урок отмечен как неоплаченный"
    );
  };

  const handleCardClick = (lesson: Lesson) => {
    setViewingLesson(lesson);
    setIsViewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLesson(undefined);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setViewingLesson(undefined);
  };

  const handleEditFromView = () => {
    if (viewingLesson) {
      setIsViewDialogOpen(false);
      setEditingLesson(viewingLesson);
      setIsDialogOpen(true);
    }
  };

  const handleCancelFromView = () => {
    if (viewingLesson) {
      setIsViewDialogOpen(false);
      handleCancelLesson(viewingLesson);
    }
  };

  const handleRestoreFromView = () => {
    if (viewingLesson) {
      setIsViewDialogOpen(false);
      handleRestoreLesson(viewingLesson);
    }
  };

  const handleRescheduleFromView = () => {
    if (viewingLesson) {
      setIsViewDialogOpen(false);
      handleRescheduleLesson(viewingLesson);
    }
  };

  const handleDeleteFromView = () => {
    if (viewingLesson) {
      setIsViewDialogOpen(false);
      handleDeleteLesson(viewingLesson);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
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
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Запланированные" />
          <Tab label="Прошедшие" />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <LessonsList
          lessons={upcomingLessons}
          onEdit={handleEditLesson}
          onDelete={handleDeleteLesson}
          onCancel={handleCancelLesson}
          onRestore={handleRestoreLesson}
          onReschedule={handleRescheduleLesson}
          onPaymentChange={handlePaymentChange}
          onCardClick={handleCardClick}
          type="scheduled"
        />
      )}

      {currentTab === 1 && (
        <>
          <LessonsList
            lessons={completedLessons}
            onEdit={handleEditLesson}
            onDelete={handleDeleteLesson}
            onPaymentChange={handlePaymentChange}
            onCardClick={handleCardClick}
            type="completed"
          />
          {completedPagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={completedPagination.totalPages}
                page={completedPagination.page}
                onChange={handleCompletedPageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add lesson"
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
        }}
        onClick={() => {
          setEditingLesson(undefined);
          setIsDialogOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs */}
      <LessonForm
        open={isDialogOpen}
        onClose={handleCloseDialog}
        lesson={editingLesson}
      />

      <LessonViewDialog
        open={isViewDialogOpen}
        onClose={handleCloseViewDialog}
        lesson={viewingLesson}
        onEdit={handleEditFromView}
        onCancel={handleCancelFromView}
        onRestore={handleRestoreFromView}
        onReschedule={handleRescheduleFromView}
        onDelete={handleDeleteFromView}
        onPaymentChange={handlePaymentChange}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />

      <LessonDeleteDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedLesson(null);
        }}
        onConfirm={handleDeleteConfirm}
        lesson={selectedLesson || undefined}
        onSuccess={showSuccess}
        onError={(error) => {
          console.error("Ошибка при удалении урока:", error);
        }}
      />

      <RescheduleDialog
        open={isRescheduleDialogOpen}
        onClose={handleCloseRescheduleDialog}
        onConfirm={handleRescheduleConfirm}
        lesson={reschedulingLesson}
        isLoading={isLoading}
      />
    </Container>
  );
};
