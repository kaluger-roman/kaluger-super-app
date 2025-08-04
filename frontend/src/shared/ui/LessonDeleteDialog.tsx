import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
  Alert,
} from "@mui/material";
import { Lesson, SUBJECT_LABELS } from "../types";

type LessonDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteAllFuture?: boolean) => void;
  lesson?: Lesson;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export const LessonDeleteDialog: React.FC<LessonDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  lesson,
  onSuccess,
  onError,
}) => {
  const [deleteAllFuture, setDeleteAllFuture] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!lesson) return;

    setIsLoading(true);
    try {
      await onConfirm(lesson.isRecurring ? deleteAllFuture : undefined);

      const message =
        lesson.isRecurring && deleteAllFuture
          ? "Урок и все несостоявшиеся копии удалены"
          : "Урок удален";

      onSuccess?.(message);
      handleClose();
    } catch (error) {
      onError?.("Не удалось удалить урок");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setDeleteAllFuture(false);
  };

  if (!lesson) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Удалить урок</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            Вы уверены, что хотите удалить урок{" "}
            <strong>{SUBJECT_LABELS[lesson.subject]}</strong> с учеником{" "}
            <strong>{lesson.student?.name}</strong>?
          </Typography>

          {lesson.isRecurring && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Это повторяющийся урок</strong>
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteAllFuture}
                    onChange={(e) => setDeleteAllFuture(e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label="Удалить все запланированные повторы этого урока"
              />
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? "Удаление..." : "Удалить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
