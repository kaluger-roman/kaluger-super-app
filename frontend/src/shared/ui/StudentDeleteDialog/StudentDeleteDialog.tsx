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

import * as Styled from "./StudentDeleteDialog.styled";
import type { Student } from "../../types";

type StudentDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  student?: Student;
  isLoading?: boolean;
};

export const StudentDeleteDialog: FC<StudentDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  student,
}) => {
  if (!student) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle>Удалить ученика</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            Вы уверены, что хотите удалить ученика <strong>{student.name}</strong>?
          </Typography>

          <Styled.StyledAlert severity="warning">
            <Styled.AlertTitle variant="body2">
              <strong>Внимание!</strong>
            </Styled.AlertTitle>
            <Typography variant="body2">
              При удалении ученика будут также удалены все его уроки.
            </Typography>
          </Styled.StyledAlert>
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
