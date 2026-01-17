import type { FC, KeyboardEvent, ChangeEvent } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import { useUnit } from "effector-react";

import { studentsArchiveModel } from "../../models";
import { ARCHIVE_REASON_OPTIONS } from "../../models/students-archive.constants";

export const StudentArchiveDialog: FC = () => {
  const student = useUnit(studentsArchiveModel.$archiveDialogStudent);
  const archiveReason = useUnit(studentsArchiveModel.$archiveReason);
  const archiveComment = useUnit(studentsArchiveModel.$archiveComment);

  const actions = useUnit({
    close: studentsArchiveModel.archiveDialogClosed,
    confirm: studentsArchiveModel.archiveConfirmed,
    reasonChanged: studentsArchiveModel.archiveReasonChanged,
    commentChanged: studentsArchiveModel.archiveCommentChanged,
  });

  if (!student) return null;

  const handleConfirm = () => {
    actions.confirm({
      archiveReason: archiveReason || undefined,
      archiveComment: archiveComment || undefined,
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={Boolean(student)}
      onClose={actions.close}
      maxWidth="sm"
      fullWidth
      onKeyDown={handleKeyDown}
    >
      <DialogTitle>Архивировать ученика</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <Typography>
            Вы уверены, что хотите архивировать ученика <strong>{student.name}</strong>?
          </Typography>

          <Alert severity="warning">
            <AlertTitle>
              <strong>Внимание!</strong>
            </AlertTitle>
            <Typography variant="body2">
              При архивации ученика будут удалены все его будущие уроки из системы.
            </Typography>
          </Alert>

          <FormControl fullWidth>
            <InputLabel id="archive-reason-label">Причина архивирования (опционально)</InputLabel>
            <Select
              labelId="archive-reason-label"
              id="archive-reason"
              value={archiveReason}
              label="Причина архивирования (опционально)"
              onChange={(e) => actions.reasonChanged(e.target.value as typeof archiveReason)}
            >
              <MenuItem value="">
                <em>Не указана</em>
              </MenuItem>
              {ARCHIVE_REASON_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Комментарий (опционально)"
            value={archiveComment}
            onChange={(e: ChangeEvent<HTMLInputElement>) => actions.commentChanged(e.target.value)}
            placeholder="Дополнительная информация..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={actions.close}>Отмена</Button>
        <Button onClick={handleConfirm} color="warning" variant="contained">
          В архив
        </Button>
      </DialogActions>
    </Dialog>
  );
};
