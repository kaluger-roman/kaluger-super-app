import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { Lesson, SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../types";

type RescheduleDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (newStartTime: Date, newEndTime: Date) => void;
  lesson?: Lesson;
  isLoading?: boolean;
};

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  open,
  onClose,
  onConfirm,
  lesson,
  isLoading = false,
}) => {
  const [newStartTime, setNewStartTime] = useState<Date>(
    lesson ? new Date(lesson.startTime) : new Date()
  );
  const [newEndTime, setNewEndTime] = useState<Date>(
    lesson ? new Date(lesson.endTime) : new Date()
  );

  const handleStartTimeChange = (date: Date | null) => {
    if (date && lesson) {
      setNewStartTime(date);
      // Automatically adjust end time to maintain lesson duration
      const originalDuration =
        new Date(lesson.endTime).getTime() -
        new Date(lesson.startTime).getTime();
      setNewEndTime(new Date(date.getTime() + originalDuration));
    }
  };

  const handleEndTimeChange = (date: Date | null) => {
    if (date) {
      setNewEndTime(date);
    }
  };

  const handleConfirm = () => {
    if (newStartTime >= newEndTime) {
      return;
    }
    onConfirm(newStartTime, newEndTime);
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  if (!lesson) return null;

  const isValidTimeRange = newStartTime < newEndTime;
  const duration = Math.round(
    (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6" gutterBottom>
            📅 Перенести урок
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {SUBJECT_LABELS[lesson.subject]} •{" "}
            {LESSON_TYPE_LABELS[lesson.lessonType]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Студент: {lesson.student?.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Текущее время:</strong>{" "}
                {new Date(lesson.startTime).toLocaleString("ru-RU")} -{" "}
                {new Date(lesson.endTime).toLocaleString("ru-RU")}
              </Typography>
            </Alert>

            <DateTimePicker
              label="Новое время начала"
              value={newStartTime}
              onChange={handleStartTimeChange}
              disabled={isLoading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !isValidTimeRange,
                },
              }}
            />

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
                },
              }}
            />

            {!isValidTimeRange && (
              <Alert severity="error">
                Время окончания должно быть позже времени начала
              </Alert>
            )}
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!isValidTimeRange || isLoading}
        >
          {isLoading ? "Переношу..." : "Перенести урок"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
