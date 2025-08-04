import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Edit as EditIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Schedule as RescheduleIcon,
} from "@mui/icons-material";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS, Lesson } from "../../../shared";
import { ConfirmDialog, PaymentStatus } from "../../../shared/ui";
import { useNotifications } from "../../../shared/lib";

type LessonViewDialogProps = {
  open: boolean;
  onClose: () => void;
  lesson?: Lesson;
  onEdit: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onReschedule?: () => void;
  onDelete: () => void;
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
};

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
  const { showSuccess } = useNotifications();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
    severity?: "warning" | "error" | "info";
  }>({
    open: false,
    title: "",
    message: "",
    action: () => {},
  });

  if (!lesson) return null;

  const handleCancel = () => {
    setConfirmDialog({
      open: true,
      title: "Отменить урок",
      message: "Вы уверены, что хотите отменить этот урок?",
      action: () => {
        onCancel();
        showSuccess("Урок отменен");
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      severity: "warning",
    });
  };

  const handleRestore = () => {
    setConfirmDialog({
      open: true,
      title: "Восстановить урок",
      message: "Вы уверены, что хотите восстановить этот урок?",
      action: () => {
        onRestore();
        showSuccess("Урок восстановлен");
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      severity: "info",
    });
  };

  const handleDelete = () => {
    setConfirmDialog({
      open: true,
      title: "Удалить урок",
      message:
        "Вы уверены, что хотите удалить этот урок? Это действие нельзя отменить.",
      action: () => {
        onDelete();
        showSuccess("Урок удален");
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      severity: "error",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "error";
      case "RESCHEDULED":
        return "warning";
      case "IN_PROGRESS":
        return "primary";
      default:
        return "primary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Завершен";
      case "CANCELLED":
        return "Отменен";
      case "RESCHEDULED":
        return "Перенесен";
      case "IN_PROGRESS":
        return "Идет сейчас";
      default:
        return "Запланирован";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
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
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Основная информация */}
          <Box>
            <Typography variant="h6" gutterBottom>
              👤 {lesson.student?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              📚 {SUBJECT_LABELS[lesson.subject]} •{" "}
              {LESSON_TYPE_LABELS[lesson.lessonType]}
            </Typography>
            <Typography variant="body1" gutterBottom>
              💰 {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
            </Typography>
            {onPaymentChange && (
              <Box sx={{ mt: 1 }}>
                <PaymentStatus
                  lesson={lesson}
                  onPaymentChange={onPaymentChange}
                />
              </Box>
            )}
          </Box>

          <Divider />

          {/* Время */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              📅 Время
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Начало: {formatDateTime(lesson.startTime)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Окончание: {formatDateTime(lesson.endTime)}
            </Typography>
          </Box>

          {/* Описание */}
          {lesson.description && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                📝 Описание
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {lesson.description}
              </Typography>
            </Box>
          )}

          {/* Домашнее задание */}
          {lesson.homework && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                📖 Домашнее задание
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {lesson.homework}
              </Typography>
            </Box>
          )}

          {/* Заметки */}
          {lesson.notes && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                🗒️ Заметки
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {lesson.notes}
              </Typography>
            </Box>
          )}

          {/* Оценка */}
          {lesson.grade && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                ⭐ Оценка
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {lesson.grade} из 5
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            width: "100%",
            gap: 2,
          }}
        >
          {/* Первый столбец: действия с уроком */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              flex: 1,
            }}
          >
            {onReschedule && (
              <Button
                onClick={onReschedule}
                variant="outlined"
                color="info"
                size="small"
                startIcon={<RescheduleIcon />}
                fullWidth
              >
                Перенести
              </Button>
            )}
            {lesson.status !== "CANCELLED" && (
              <Button
                onClick={handleCancel}
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<CancelIcon />}
                fullWidth
              >
                Отменить
              </Button>
            )}
            {lesson.status === "CANCELLED" && (
              <Button
                onClick={handleRestore}
                variant="outlined"
                color="success"
                size="small"
                startIcon={<RestoreIcon />}
                fullWidth
              >
                Восстановить
              </Button>
            )}
            <Button
              onClick={handleDelete}
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              fullWidth
            >
              Удалить
            </Button>
          </Box>
          {/* Второй столбец: закрыть и редактировать */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              flex: 1,
              mt: isMobile ? 2 : 0,
            }}
          >
            <Button onClick={onClose} variant="outlined" fullWidth>
              Закрыть
            </Button>
            <Button
              onClick={onEdit}
              variant="contained"
              startIcon={<EditIcon />}
              fullWidth
            >
              Редактировать
            </Button>
          </Box>
        </Box>
      </DialogActions>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity}
      />
    </Dialog>
  );
};
