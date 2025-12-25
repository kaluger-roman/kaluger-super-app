import type { FC } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useUnit } from "effector-react";

import { getStatusColor, getStatusLabel } from "@shared";
import { ConfirmDialog } from "@shared/ui";

import { LessonDetails } from "./LessonDetails";
import { LessonDialogActions } from "./LessonDialogActions";
import * as Styled from "./LessonViewDialog.styled";
import { lessonsModel } from "../../models";

export const LessonViewDialog: FC = () => {
  const open = useUnit(lessonsModel.$isViewDialogOpen);
  const lesson = useUnit(lessonsModel.$viewingLesson);
  const confirmDialog = useUnit(lessonsModel.$confirmDialog);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const actions = useUnit({
    viewDialogClosed: lessonsModel.viewDialogClosed,
    confirmDialogClosed: lessonsModel.confirmDialogClosed,
  });

  if (!lesson) return null;

  return (
    <Dialog
      open={open}
      onClose={() => actions.viewDialogClosed()}
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
        <Styled.StatusChipBox>
          <Typography variant="h6">Урок</Typography>
          <Chip
            label={getStatusLabel(lesson.status)}
            color={getStatusColor(lesson.status)}
            size="small"
          />
        </Styled.StatusChipBox>
      </DialogTitle>

      <DialogContent>
        <LessonDetails lesson={lesson} />
      </DialogContent>

      <Styled.ActionsBox>
        <LessonDialogActions lesson={lesson} isMobile={isMobile} />
      </Styled.ActionsBox>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={actions.confirmDialogClosed}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />
    </Dialog>
  );
};
