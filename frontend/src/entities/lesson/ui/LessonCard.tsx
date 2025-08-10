import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Rating,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  Lesson,
  formatDateTime,
  formatCurrency,
  formatDuration,
  RecurringLessonDeleteDialog,
} from "../../../shared";
import { removeLesson, closeLessonDialog } from "../model/lesson";
import { showError } from "../../../shared/model/notifications";
import { LessonForm } from "../../../features/lessons";

type LessonCardProps = {
  lesson: Lesson;
  onClick?: () => void;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "SCHEDULED":
      return "info";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    case "RESCHEDULED":
      return "warning";
    case "IN_PROGRESS":
      return "primary";
    default:
      return "default";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "SCHEDULED":
      return "Запланирован";
    case "COMPLETED":
      return "Завершен";
    case "CANCELLED":
      return "Отменен";
    case "RESCHEDULED":
      return "Перенесен";
    case "IN_PROGRESS":
      return "Идет сейчас";
    default:
      return status;
  }
};

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, onClick }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Подписываемся на событие закрытия диалога
  useEffect(() => {
    const unsubscribe = closeLessonDialog.watch(() => {
      setEditDialogOpen(false);
      setDeleteDialogOpen(false);
    });
    return unsubscribe;
  }, []);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async (deleteAllFuture: boolean = false) => {
    try {
      removeLesson({ id: lesson.id, deleteAllFuture });
      // Не закрываем диалог здесь - он закроется автоматически при успехе
    } catch (error) {
      showError("Ошибка при удалении урока");
    }
  };

  const startTime = new Date(lesson.startTime);
  const endTime = new Date(lesson.endTime);

  return (
    <>
      <Card
        sx={{
          cursor: onClick ? "pointer" : "default",
          "&:hover": onClick ? { boxShadow: 3 } : {},
          position: "relative",
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box flex={1}>
              <Typography variant="h6" component="h3" gutterBottom>
                {lesson.subject === "MATHEMATICS"
                  ? "📐 Математика"
                  : "⚗️ Физика"}
              </Typography>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                {lesson.student?.name || "Ученик не указан"}
              </Typography>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                {formatDateTime(startTime)}
              </Typography>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Продолжительность: {formatDuration(startTime, endTime)}
              </Typography>

              {lesson.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {lesson.description}
                </Typography>
              )}
            </Box>

            <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 1 }}>
              <MoreIcon />
            </IconButton>
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={2}
          >
            <Chip
              label={getStatusText(lesson.status)}
              color={getStatusColor(lesson.status) as any}
              size="small"
            />

            {lesson.price && (
              <Chip
                label={formatCurrency(lesson.price)}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          {lesson.grade && lesson.status === "COMPLETED" && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Оценка:
              </Typography>
              <Rating value={lesson.grade} readOnly size="small" />
            </Box>
          )}

          {lesson.homework && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Домашнее задание:
              </Typography>
              <Typography variant="body2">{lesson.homework}</Typography>
            </Box>
          )}

          {lesson.notes && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Заметки:
              </Typography>
              <Typography variant="body2">{lesson.notes}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <LessonForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        lesson={lesson}
      />

      {/* Delete Confirmation Dialog */}
      <RecurringLessonDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        lesson={lesson}
      />
    </>
  );
};
