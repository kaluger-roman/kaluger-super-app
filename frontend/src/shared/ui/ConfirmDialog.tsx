import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";

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

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          m: isMobile ? 2 : 3,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color={getSeverityColor()} />
          <Typography variant={isMobile ? "h6" : "h6"}>{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant={isMobile ? "body2" : "body1"}>{message}</Typography>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        pt: 1,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 1 : 0,
      }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          fullWidth={isMobile}
        >
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
      </DialogActions>
    </Dialog>
  );
};
