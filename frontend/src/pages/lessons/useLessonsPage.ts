import { useState, useEffect } from "react";
import {
  loadCompletedLessons,
  loadCancelledLessons,
  loadUpcomingLessons,
  removeLesson,
  updateLesson,
  closeLessonDialog,
  $completedPagination,
  $cancelledPagination,
} from "../../entities";
import { useStore } from "effector-react";
import type { Lesson } from "../../shared";
import type { LessonsPageState, ConfirmDialogState } from "./types";

export const useLessonsPage = () => {
  const completedPagination = useStore($completedPagination);
  const cancelledPagination = useStore($cancelledPagination);

  const [state, setState] = useState<LessonsPageState>({
    currentTab: 0,
    isDialogOpen: false,
    isViewDialogOpen: false,
    isRescheduleDialogOpen: false,
    deleteDialogOpen: false,
    selectedLesson: null,
  });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    action: () => {},
  });

  // Load lessons based on current tab
  useEffect(() => {
    switch (state.currentTab) {
      case 1: // Прошедшие
        loadCompletedLessons({ page: 1, limit: 10 });
        break;
      case 2: // Отмененные
        loadCancelledLessons({ page: 1, limit: 10 });
        break;
      default:
        // Запланированные загружаются в основном компоненте
        break;
    }
  }, [state.currentTab]);

  // Подписываемся на событие закрытия диалога
  useEffect(() => {
    const unsubscribe = closeLessonDialog.watch(() => {
      setState({
        currentTab: state.currentTab,
        isDialogOpen: false,
        isViewDialogOpen: false,
        isRescheduleDialogOpen: false,
        deleteDialogOpen: false,
        selectedLesson: null,
      });
    });
    return unsubscribe;
  }, [state.currentTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setState((prev) => ({ ...prev, currentTab: newValue }));
  };

  const handleCompletedPageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    loadCompletedLessons({ page, limit: 10 });
  };

  const handleCancelledPageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    loadCancelledLessons({ page, limit: 10 });
  };

  // rescheduled page handling removed

  const handleUpcomingPageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    loadUpcomingLessons({ page, limit: 10 });
  };

  const handleEditLesson = (lesson: Lesson) => {
    setState((prev) => ({
      ...prev,
      editingLesson: lesson,
      isDialogOpen: true,
    }));
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    setState((prev) => ({
      ...prev,
      selectedLesson: lesson,
      deleteDialogOpen: true,
    }));
  };

  const handleDeleteConfirm = async (deleteAllFuture?: boolean) => {
    if (!state.selectedLesson) return;

    removeLesson({
      id: state.selectedLesson.id,
      deleteAllFuture,
    });

    // Reload lessons based on current tab
    switch (state.currentTab) {
      case 1:
        loadCompletedLessons({ page: completedPagination.page, limit: 10 });
        break;
      case 2:
        loadCancelledLessons({ page: cancelledPagination.page, limit: 10 });
        break;
      default:
        break;
    }
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
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      severity: "info",
    });
  };

  const handleRescheduleLesson = (lesson: Lesson) => {
    setState((prev) => ({
      ...prev,
      reschedulingLesson: lesson,
      isRescheduleDialogOpen: true,
    }));
  };

  const handleRescheduleConfirm = async (
    newStartTime: Date,
    newEndTime: Date
  ) => {
    if (!state.reschedulingLesson) return;

    try {
      await updateLesson({
        id: state.reschedulingLesson.id,
        data: {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          status: "RESCHEDULED",
        },
      });
      setState((prev) => ({
        ...prev,
        isRescheduleDialogOpen: false,
        reschedulingLesson: undefined,
      }));
    } catch (error) {
      console.error("Reschedule lesson error:", error);
    }
  };

  const handlePaymentChange = (lessonId: string, isPaid: boolean) => {
    updateLesson({
      id: lessonId,
      data: { isPaid },
    });
  };

  const handleHomeworkSentChange = (lessonId: string, isSent: boolean) => {
    updateLesson({
      id: lessonId,
      data: { isHomeworkSentByTeacher: isSent },
    });
  };

  const handleCardClick = (lesson: Lesson) => {
    setState((prev) => ({
      ...prev,
      viewingLesson: lesson,
      isViewDialogOpen: true,
    }));
  };

  return {
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
  };
};
