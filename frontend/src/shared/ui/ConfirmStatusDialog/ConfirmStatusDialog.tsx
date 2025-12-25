import type { FC, KeyboardEvent, ReactNode, SyntheticEvent } from "react";

import type { ButtonProps } from "@mui/material";
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
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: ButtonProps["color"];
  onConfirm: () => void;
  onClose: () => void;
  stopPropagation?: boolean;
};

export const ConfirmStatusDialog: FC<Props> = ({
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
  const handleClose = () => {
    // stopPropagation handled on click handler; just call onClose
    onClose();
  };

  const handleConfirm = (e?: SyntheticEvent) => {
    if (stopPropagation && e) e.stopPropagation();
    onConfirm();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      onClick={(e) => stopPropagation && e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description && <Typography>{description}</Typography>}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{cancelLabel}</Button>
        <Button onClick={handleConfirm} variant="contained" color={confirmColor}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
