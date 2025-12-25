import type { FC, KeyboardEvent } from "react";

import { Warning as WarningIcon } from "@mui/icons-material";
import { DialogTitle, DialogContent, Button, useMediaQuery, useTheme } from "@mui/material";

import * as Styled from "./ConfirmDialog.styled";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: "warning" | "error" | "info";
};

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  severity = "warning",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getSeverityColor = () => {
    switch (severity) {
      case "error":
        return "error";
      case "info":
        return "info";
      default:
        return "warning";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onConfirm();
    }
  };

  return (
    <Styled.StyledDialog
      open={open}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      maxWidth="xs"
      fullWidth
      $isMobile={isMobile}
    >
      <DialogTitle>
        <Styled.TitleBox>
          <WarningIcon color={getSeverityColor()} />
          <Styled.TitleText $isMobile={isMobile}>{title}</Styled.TitleText>
        </Styled.TitleBox>
      </DialogTitle>

      <DialogContent>
        <Styled.ContentText $isMobile={isMobile}>{message}</Styled.ContentText>
      </DialogContent>

      <Styled.ActionsBox $isMobile={isMobile}>
        <Button onClick={onClose} variant="outlined" fullWidth={isMobile}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getSeverityColor()}
          fullWidth={isMobile}
        >
          {confirmText}
        </Button>
      </Styled.ActionsBox>
    </Styled.StyledDialog>
  );
};
