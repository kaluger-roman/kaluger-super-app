import type { FC } from "react";

import { useUnit } from "effector-react";

import { ConfirmDialog, LessonDeleteDialog, RescheduleDialog } from "@shared";

import { lessonsModel } from "../../models";
import { LessonForm } from "../LessonForm";
import { LessonViewDialog } from "../LessonViewDialog";

export const LessonDialogs: FC = () => {
  const confirmDialog = useUnit(lessonsModel.$confirmDialog);
  const isRescheduling = useUnit(lessonsModel.$isRescheduling);
  const actions = useUnit({
    confirmDialogClosed: lessonsModel.confirmDialogClosed,
    deleteRequested: lessonsModel.lessonDeleteRequestedFromDialog,
    rescheduleRequested: lessonsModel.lessonRescheduleRequestedFromDialog,
  });

  return (
    <>
      <LessonForm />

      <LessonViewDialog />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={actions.confirmDialogClosed}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />

      <LessonDeleteDialog
        onConfirm={(deleteAllFuture) => actions.deleteRequested({ deleteAllFuture })}
      />

      <RescheduleDialog
        onConfirm={(newStartTime, newEndTime) =>
          actions.rescheduleRequested({ newStartTime, newEndTime })
        }
        isLoading={isRescheduling}
      />
    </>
  );
};
