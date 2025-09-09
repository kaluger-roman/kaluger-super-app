import React, { useState } from "react";
import {
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { Lesson } from "../types";
import ToggleSwitch from "./ToggleSwitch";

type HomeworkSentStatusProps = {
  lesson: Lesson;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  size?: "small" | "medium";
  showLabel?: boolean;
  needConfirm?: boolean;
};

export const HomeworkSentStatus: React.FC<HomeworkSentStatusProps> = ({
  lesson,
  onHomeworkSentChange,
  size = "medium",
  showLabel = true,
  needConfirm = false,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null);

  const handleToggle = (newStatus: boolean) => {
    if (needConfirm) {
      setPendingStatus(newStatus);
      setConfirmOpen(true);
    } else {
      onHomeworkSentChange?.(lesson.id, newStatus);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus !== null) {
      onHomeworkSentChange?.(lesson.id, pendingStatus);
    }
    setConfirmOpen(false);
    setPendingStatus(null);
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingStatus(null);
  };

  return (
    <>
      <FormControlLabel
        onClick={(e) => e.stopPropagation()}
        control={
          <ToggleSwitch
            checked={!!lesson.isHomeworkSentByTeacher}
            onToggle={(next) => handleToggle(next)}
            size={size}
          />
        }
        label={
          showLabel
            ? lesson.isHomeworkSentByTeacher
              ? "ДЗ отправлено"
              : "ДЗ не отправлено"
            : undefined
        }
        sx={{
          ".MuiFormControlLabel-label": {
            color: lesson.isHomeworkSentByTeacher
              ? "success.main"
              : "error.main",
            fontWeight: 500,
          },
        }}
      />

      <Dialog
        onClick={(e) => e.stopPropagation()}
        open={confirmOpen}
        onClose={handleCancel}
        maxWidth="sm"
      >
        <DialogTitle>
          {pendingStatus
            ? "Отметить ДЗ как отправленное"
            : "Отметить ДЗ как неотправленное"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography>
              Вы уверены, что хотите отметить домашнее задание как{" "}
              <strong>
                {pendingStatus ? "отправленное" : "неотправленное"}
              </strong>
              ?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Урок: <strong>{lesson.student?.name}</strong>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Отмена</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={pendingStatus ? "primary" : "warning"}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
