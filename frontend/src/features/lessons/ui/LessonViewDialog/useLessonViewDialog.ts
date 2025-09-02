import { useState } from "react";
import type { ConfirmDialogState } from "./types";

export const useLessonViewDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    action: () => {},
  });

  const openConfirmDialog = (dialog: Omit<ConfirmDialogState, "open">) => {
    setConfirmDialog({
      ...dialog,
      open: true,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  const createCancelHandler = (onCancel: () => void) => () => {
    openConfirmDialog({
      title: "Отменить урок",
      message: "Вы уверены, что хотите отменить этот урок?",
      action: () => {
        onCancel();
        closeConfirmDialog();
      },
      severity: "warning",
    });
  };

  const createRestoreHandler = (onRestore: () => void) => () => {
    openConfirmDialog({
      title: "Восстановить урок",
      message: "Вы уверены, что хотите восстановить этот урок?",
      action: () => {
        onRestore();
        closeConfirmDialog();
      },
      severity: "info",
    });
  };

  const createDeleteHandler = (onDelete: () => void) => () => {
    openConfirmDialog({
      title: "Удалить урок",
      message:
        "Вы уверены, что хотите удалить этот урок? Это действие нельзя отменить.",
      action: () => {
        onDelete();
        closeConfirmDialog();
      },
      severity: "error",
    });
  };

  return {
    confirmDialog,
    closeConfirmDialog,
    createCancelHandler,
    createRestoreHandler,
    createDeleteHandler,
  };
};
