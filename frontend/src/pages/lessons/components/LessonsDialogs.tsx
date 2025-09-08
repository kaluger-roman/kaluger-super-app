import React from "react";
import { LessonForm, LessonViewDialog } from "../../../features/lessons";
import {
  ConfirmDialog,
  LessonDeleteDialog,
  RescheduleDialog,
} from "../../../shared/ui";
import type { LessonsPageState, ConfirmDialogState } from "../types";

type LessonsDialogsProps = {
  state: LessonsPageState;
  confirmDialog: ConfirmDialogState;
  isLoading: boolean;
  onCloseDialog: () => void;
  onCloseViewDialog: () => void;
  onCloseRescheduleDialog: () => void;
  onCloseDeleteDialog: () => void;
  onCloseConfirmDialog: () => void;
  onEditFromView: () => void;
  onCancelFromView: () => void;
  onRestoreFromView: () => void;
  onRescheduleFromView: () => void;
  onDeleteFromView: () => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  onDeleteConfirm: (deleteAllFuture?: boolean) => void;
  onRescheduleConfirm: (newStartTime: Date, newEndTime: Date) => void;
  onConfirmAction: () => void;
};

export const LessonsDialogs: React.FC<LessonsDialogsProps> = ({
  state,
  confirmDialog,
  isLoading,
  onCloseDialog,
  onCloseViewDialog,
  onCloseRescheduleDialog,
  onCloseDeleteDialog,
  onCloseConfirmDialog,
  onEditFromView,
  onCancelFromView,
  onRestoreFromView,
  onRescheduleFromView,
  onDeleteFromView,
  onPaymentChange,
  onHomeworkSentChange,
  onDeleteConfirm,
  onRescheduleConfirm,
  onConfirmAction,
}) => {
  return (
    <>
      <LessonForm
        open={state.isDialogOpen}
        onClose={onCloseDialog}
        lesson={state.editingLesson}
      />

      <LessonViewDialog
        open={state.isViewDialogOpen}
        onClose={onCloseViewDialog}
        lesson={state.viewingLesson}
        onEdit={onEditFromView}
        onCancel={onCancelFromView}
        onRestore={onRestoreFromView}
        onReschedule={onRescheduleFromView}
        onDelete={onDeleteFromView}
        onPaymentChange={onPaymentChange}
        onHomeworkSentChange={onHomeworkSentChange}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={onCloseConfirmDialog}
        onConfirm={onConfirmAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />

      <LessonDeleteDialog
        open={state.deleteDialogOpen}
        onClose={onCloseDeleteDialog}
        onConfirm={onDeleteConfirm}
        lesson={state.selectedLesson || undefined}
        onError={(error) => {
          console.error("Ошибка при удалении урока:", error);
        }}
      />

      <RescheduleDialog
        open={state.isRescheduleDialogOpen}
        onClose={onCloseRescheduleDialog}
        onConfirm={onRescheduleConfirm}
        lesson={state.reschedulingLesson}
        isLoading={isLoading}
      />
    </>
  );
};
