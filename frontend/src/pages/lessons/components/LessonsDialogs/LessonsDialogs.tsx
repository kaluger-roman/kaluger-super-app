import type { FC } from "react";

import { useUnit } from "effector-react";

import { LessonForm, LessonViewDialog, lessonsModel } from "@features/lessons";
import { ConfirmDialog, LessonDeleteDialog, RescheduleDialog } from "@shared/ui";

export const LessonsDialogs: FC = () => {
  const confirmDialog = useUnit(lessonsModel.$confirmDialog);

  const handleDeleteConfirm = (deleteAllFuture?: boolean) => {
    lessonsModel.lessonDeleteRequestedFromDialog({ deleteAllFuture });
  };

  const handleRescheduleConfirm = (newStartTime: Date, newEndTime: Date) => {
    lessonsModel.lessonRescheduleRequestedFromDialog({ newStartTime, newEndTime });
  };

  return (
    <>
      <LessonForm />

      <LessonViewDialog />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={lessonsModel.confirmDialogClosed}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />

      <LessonDeleteDialog
        onConfirm={handleDeleteConfirm}
        onError={(error) => {
          console.error("Ошибка при удалении урока:", error);
        }}
      />

      <RescheduleDialog onConfirm={handleRescheduleConfirm} />
    </>
  );
};
