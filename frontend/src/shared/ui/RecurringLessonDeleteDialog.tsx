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
} from "@mui/material";
import { Lesson, SUBJECT_LABELS } from "../types";

type RecurringLessonDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteAllFuture: boolean) => void;
  lesson?: Lesson;
};

export const RecurringLessonDeleteDialog: React.FC<
  RecurringLessonDeleteDialogProps
> = ({ open, onClose, onConfirm, lesson }) => {
  const [deleteAllFuture, setDeleteAllFuture] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteAllFuture);
    setDeleteAllFuture(false);
  };

  const handleClose = () => {
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
            <Box>
              <Typography color="warning.main" sx={{ mb: 2 }}>
                ⚠️ Это повторяющийся урок
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteAllFuture}
                    onChange={(e) => setDeleteAllFuture(e.target.checked)}
                  />
                }
                label="Удалить все запланированные повторы этого урока"
              />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Отмена</Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
