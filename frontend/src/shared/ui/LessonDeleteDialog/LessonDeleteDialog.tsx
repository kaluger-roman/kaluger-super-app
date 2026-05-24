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

import * as lessonDeleteDialogModel from "./lesson-delete-dialog.model";
import * as Styled from "./LessonDeleteDialog.styled";
import { SUBJECT_LABELS } from "../../constants";
import { formatDate, formatTimeRange } from "../../lib";

type LessonDeleteDialogProps = {
  onConfirm: (deleteAllFuture?: boolean) => void;
};

export const LessonDeleteDialog: FC<LessonDeleteDialogProps> = ({ onConfirm }) => {
  const open = useUnit(lessonDeleteDialogModel.$isOpen);
  const lesson = useUnit(lessonDeleteDialogModel.$lesson);
  const deleteAllFuture = useUnit(lessonDeleteDialogModel.$deleteAllFuture);
  const isLoading = useUnit(lessonDeleteDialogModel.$isLoading);

  const handleConfirm = () => {
    if (!lesson) return;
    onConfirm(lesson.isRecurring ? deleteAllFuture : undefined);
  };

  const handleClose = () => {
    if (isLoading) return;
    lessonDeleteDialogModel.lessonDeleteDialogClosed();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !isLoading) {
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
            учеником <strong>{lesson.student?.name}</strong>{" "}
            <strong>
              {formatDate(lesson.startTime)}, {formatTimeRange(lesson.startTime, lesson.endTime)}
            </strong>
            ?
          </Typography>

          {lesson.isRecurring && (
            <Styled.StyledAlert severity="warning">
              <Styled.AlertTitle variant="body2">
                <strong>Это повторяющийся урок</strong>
              </Styled.AlertTitle>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteAllFuture}
                    onChange={(e) =>
                      lessonDeleteDialogModel.deleteAllFutureToggled(e.target.checked)
                    }
                    disabled={isLoading}
                  />
                }
                label="Удалить все запланированные повторы этого урока"
              />
            </Styled.StyledAlert>
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
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={isLoading}>
          {isLoading ? "Удаление..." : "Удалить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
