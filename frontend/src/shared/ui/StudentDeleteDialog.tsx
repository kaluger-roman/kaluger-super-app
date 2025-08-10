import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import { Student } from "../types";

type StudentDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  student?: Student;
  isLoading?: boolean;
};

export const StudentDeleteDialog: React.FC<StudentDeleteDialogProps> = ({
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Удалить ученика</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            Вы уверены, что хотите удалить ученика{" "}
            <strong>{student.name}</strong>?
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Внимание!</strong>
            </Typography>
            <Typography variant="body2">
              При удалении ученика будут также удалены все его уроки.
            </Typography>
          </Alert>
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
