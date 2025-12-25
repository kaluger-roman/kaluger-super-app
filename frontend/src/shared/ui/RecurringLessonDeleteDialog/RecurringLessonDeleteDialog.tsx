import type { FC, KeyboardEvent } from "react";

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
import { useUnit } from "effector-react";

import * as model from "./RecurringLessonDeleteDialog.model";
import * as Styled from "./RecurringLessonDeleteDialog.styled";
import { SUBJECT_LABELS } from "../../constants";
import type { Lesson } from "../../types";

type RecurringLessonDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteAllFuture: boolean) => void;
  lesson?: Lesson;
};

export const RecurringLessonDeleteDialog: FC<RecurringLessonDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  lesson,
}) => {
  const deleteAllFuture = useUnit(model.$deleteAllFuture);

  const handleConfirm = () => {
    onConfirm(deleteAllFuture);
    model.dialogClosed();
  };

  const handleClose = () => {
    onClose();
    model.dialogClosed();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    }
  };

  if (!lesson) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle>Удалить урок</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            Вы уверены, что хотите удалить урок <strong>{SUBJECT_LABELS[lesson.subject]}</strong> с
            учеником <strong>{lesson.student?.name}</strong>?
          </Typography>

          {lesson.isRecurring && (
            <Box>
              <Styled.WarningText>⚠️ Это повторяющийся урок</Styled.WarningText>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteAllFuture}
                    onChange={(_, v) => model.deleteAllFutureToggled(v)}
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
