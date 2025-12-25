import type { FC, KeyboardEvent } from "react";

import { DialogTitle, Button, Typography, Alert, useMediaQuery, useTheme } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";
import { useUnit } from "effector-react";

import * as rescheduleDialogModel from "./reschedule-dialog.model";
import * as Styled from "./RescheduleDialog.styled";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../constants";
import { PastDateNotice } from "../PastDateNotice";

type RescheduleDialogProps = {
  onConfirm: (newStartTime: Date, newEndTime: Date) => void;
  isLoading?: boolean;
};

export const RescheduleDialog: FC<RescheduleDialogProps> = ({ onConfirm, isLoading = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const open = useUnit(rescheduleDialogModel.$isOpen);
  const lesson = useUnit(rescheduleDialogModel.$lesson);
  const newStartTime = useUnit(rescheduleDialogModel.$newStartTime);
  const newEndTime = useUnit(rescheduleDialogModel.$newEndTime);

  const handleStartTimeChange = (date: Date | null) => {
    if (date) {
      rescheduleDialogModel.newStartTimeChanged(date);
    }
  };

  const handleEndTimeChange = (date: Date | null) => {
    if (date) {
      rescheduleDialogModel.newEndTimeChanged(date);
    }
  };

  const handleConfirm = () => {
    if (!newStartTime || !newEndTime || newStartTime >= newEndTime) {
      return;
    }
    onConfirm(newStartTime, newEndTime);
  };

  const handleClose = () => {
    if (isLoading) return;
    rescheduleDialogModel.rescheduleDialogClosed();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoading && isValidTimeRange) {
        handleConfirm();
      }
    }
  };

  if (!lesson || !newStartTime || !newEndTime) return null;

  const isValidTimeRange = newStartTime < newEndTime;
  const duration = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60));

  return (
    <Styled.StyledDialog
      open={open}
      onClose={handleClose}
      onKeyDown={handleKeyDown}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      $isMobile={isMobile}
    >
      <DialogTitle>
        <Styled.TitleContainer>
          <Typography variant="h6" gutterBottom>
            📅 Перенести урок
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ученик: {lesson.student?.name}
          </Typography>
        </Styled.TitleContainer>
      </DialogTitle>

      <Styled.ContentContainer $isMobile={isMobile}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          <Styled.FormContainer $isMobile={isMobile}>
            <Styled.CurrentTimeAlert severity="info">
              <Typography variant="body2">
                <strong>Текущее время:</strong> {new Date(lesson.startTime).toLocaleString("ru-RU")}{" "}
                - {new Date(lesson.endTime).toLocaleString("ru-RU")}
              </Typography>
            </Styled.CurrentTimeAlert>

            <DateTimePicker
              label="Новое время начала"
              value={newStartTime}
              onChange={handleStartTimeChange}
              disabled={isLoading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !isValidTimeRange,
                  size: isMobile ? "small" : "medium",
                },
              }}
            />

            <PastDateNotice startTime={newStartTime} endTime={newEndTime} lesson={lesson} />

            <DateTimePicker
              label="Новое время окончания"
              value={newEndTime}
              onChange={handleEndTimeChange}
              disabled={isLoading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !isValidTimeRange,
                  helperText: isValidTimeRange
                    ? `Продолжительность: ${duration} мин.`
                    : "Время окончания должно быть позже времени начала",
                  size: isMobile ? "small" : "medium",
                },
              }}
            />

            {!isValidTimeRange && (
              <Alert severity="error">Время окончания должно быть позже времени начала</Alert>
            )}
          </Styled.FormContainer>
        </LocalizationProvider>
      </Styled.ContentContainer>

      <Styled.StyledDialogActions $isMobile={isMobile}>
        <Button onClick={handleClose} disabled={isLoading} fullWidth={isMobile}>
          Отмена
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!isValidTimeRange || isLoading}
          fullWidth={isMobile}
        >
          {isLoading ? "Переношу..." : "Перенести урок"}
        </Button>
      </Styled.StyledDialogActions>
    </Styled.StyledDialog>
  );
};
