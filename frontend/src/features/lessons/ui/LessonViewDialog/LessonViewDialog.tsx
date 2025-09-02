import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ConfirmDialog } from "../../../../shared/ui";
import { LessonDetails } from "./LessonDetails";
import { LessonDialogActions } from "./LessonDialogActions";
import { useLessonViewDialog } from "./useLessonViewDialog";
import { getStatusColor, getStatusLabel } from "./utils";
import type { LessonViewDialogProps } from "./types";

export const LessonViewDialog: React.FC<LessonViewDialogProps> = ({
  open,
  onClose,
  lesson,
  onEdit,
  onCancel,
  onRestore,
  onReschedule,
  onDelete,
  onPaymentChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    confirmDialog,
    closeConfirmDialog,
    createCancelHandler,
    createRestoreHandler,
    createDeleteHandler,
  } = useLessonViewDialog();

  if (!lesson) return null;

  const handleCancel = createCancelHandler(onCancel);
  const handleRestore = createRestoreHandler(onRestore);
  const handleDelete = createDeleteHandler(onDelete);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? "100vh" : "90vh",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Урок</Typography>
          <Chip
            label={getStatusLabel(lesson.status)}
            color={getStatusColor(lesson.status)}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <LessonDetails lesson={lesson} onPaymentChange={onPaymentChange} />
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <LessonDialogActions
          lesson={lesson}
          isMobile={isMobile}
          onEdit={onEdit}
          onClose={onClose}
          onReschedule={onReschedule}
          onCancel={handleCancel}
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
      </DialogActions>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />
    </Dialog>
  );
};
