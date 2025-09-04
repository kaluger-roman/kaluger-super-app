import React from "react";
import { Box, Button } from "@mui/material";
import {
  Edit as EditIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Schedule as RescheduleIcon,
} from "@mui/icons-material";
import type { Lesson } from "../../../../shared";

type LessonDialogActionsProps = {
  lesson: Lesson;
  isMobile: boolean;
  onEdit: () => void;
  onClose: () => void;
  onReschedule?: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onDelete: () => void;
};

export const LessonDialogActions: React.FC<LessonDialogActionsProps> = ({
  lesson,
  isMobile,
  onEdit,
  onClose,
  onReschedule,
  onCancel,
  onRestore,
  onDelete,
}) => {
  return (
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
        {onReschedule && lesson.status !== "CANCELLED" && (
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
            onClick={onCancel}
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
            onClick={onRestore}
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
          onClick={onDelete}
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
  );
};
