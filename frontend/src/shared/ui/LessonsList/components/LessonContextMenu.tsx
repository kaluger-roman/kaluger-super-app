import React from "react";
import { Menu, MenuItem } from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Schedule as RescheduleIcon,
} from "@mui/icons-material";
import { Lesson } from "../../../types";

type LessonContextMenuProps = {
  anchorEl: HTMLElement | null;
  selectedLesson: Lesson | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onCancel?: () => void;
  onRestore?: () => void;
  onReschedule?: () => void;
};

export const LessonContextMenu: React.FC<LessonContextMenuProps> = ({
  anchorEl,
  selectedLesson,
  onClose,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      {onEdit && (
        <MenuItem onClick={onEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
      )}
      {onReschedule && (
        <MenuItem onClick={onReschedule}>
          <RescheduleIcon sx={{ mr: 1 }} />
          Перенести урок
        </MenuItem>
      )}
      {selectedLesson?.status !== "CANCELLED" && onCancel && (
        <MenuItem onClick={onCancel}>
          <CancelIcon sx={{ mr: 1 }} />
          Отменить урок
        </MenuItem>
      )}
      {selectedLesson?.status === "CANCELLED" && onRestore && (
        <MenuItem onClick={onRestore}>
          <RestoreIcon sx={{ mr: 1 }} />
          Восстановить урок
        </MenuItem>
      )}
      <MenuItem onClick={onDelete} sx={{ color: "error.main" }}>
        <DeleteIcon sx={{ mr: 1 }} />
        Удалить
      </MenuItem>
    </Menu>
  );
};
