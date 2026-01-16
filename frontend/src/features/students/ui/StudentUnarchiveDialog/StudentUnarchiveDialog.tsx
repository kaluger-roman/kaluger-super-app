import type { FC, KeyboardEvent } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useUnit } from "effector-react";

import { studentsArchiveModel } from "@features/students";

export const StudentUnarchiveDialog: FC = () => {
  const student = useUnit(studentsArchiveModel.$unarchiveDialogStudent);
  const open = Boolean(student);

  const actions = useUnit({
    close: studentsArchiveModel.unarchiveDialogClosed,
    confirm: studentsArchiveModel.unarchiveConfirmed,
  });

  if (!student) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      actions.confirm();
    }
  };

  return (
    <Dialog open={open} onClose={actions.close} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle>Разархивировать ученика</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            Вы уверены, что хотите вернуть ученика <strong>{student.name}</strong> из архива?
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={actions.close}>Отмена</Button>
        <Button onClick={actions.confirm} color="primary" variant="contained">
          Из архива
        </Button>
      </DialogActions>
    </Dialog>
  );
};
