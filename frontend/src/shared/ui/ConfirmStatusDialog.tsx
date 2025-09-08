import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

type Props = {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "success" | "warning" | "error";
  onConfirm: () => void;
  onClose: () => void;
  stopPropagation?: boolean;
};

export const ConfirmStatusDialog: React.FC<Props> = ({
  open,
  title,
  description,
  children,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  confirmColor = "primary",
  onConfirm,
  onClose,
  stopPropagation = true,
}) => {
  const handleClose = (event?: unknown, reason?: string) => {
    // stopPropagation handled on click handler; just call onClose
    onClose();
  };

  const handleConfirm = (e?: React.SyntheticEvent) => {
    if (stopPropagation && e) e.stopPropagation();
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      onClick={(e) => stopPropagation && e.stopPropagation()}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description && <Typography>{description}</Typography>}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{cancelLabel}</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={confirmColor as any}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmStatusDialog;
