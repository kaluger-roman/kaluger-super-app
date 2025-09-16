import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { Lesson, SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../types";
import { PastDateNotice } from "../../features/lessons/ui/LessonForm/components/PastDateNotice";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [newStartTime, setNewStartTime] = useState<Date>(() => {
    if (lesson) {
      return new Date(lesson.startTime);
    }
    const now = new Date();
    return now;
  });

  const [newEndTime, setNewEndTime] = useState<Date>(() => {
    if (lesson) {
      return new Date(lesson.endTime);
    }
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000); // +1 час по умолчанию
  });

  // Обновляем время при изменении урока
  useEffect(() => {
    if (lesson) {
      setNewStartTime(new Date(lesson.startTime));
      setNewEndTime(new Date(lesson.endTime));
    }
  }, [lesson]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoading && isValidTimeRange) {
        handleConfirm();
      }
    }
  };

  if (!lesson) return null;

  const isValidTimeRange = newStartTime < newEndTime;
  const duration = Math.round(
    (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60)
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      onKeyDown={handleKeyDown}
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
        <Box>
          <Typography variant="h6" gutterBottom>
            📅 Перенести урок
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {SUBJECT_LABELS[lesson.subject]} •{" "}
            {LESSON_TYPE_LABELS[lesson.lessonType]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ученик: {lesson.student?.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          <Box
            display="flex"
            flexDirection="column"
            gap={isMobile ? 2 : 3}
            mt={2}
          >
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
                  size: isMobile ? "small" : "medium",
                },
              }}
            />

            <PastDateNotice
              startTime={newStartTime}
              endTime={newEndTime}
              lesson={lesson}
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
                  size: isMobile ? "small" : "medium",
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

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 1.5,
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 1 : 0,
        }}
      >
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
      </DialogActions>
    </Dialog>
  );
};
