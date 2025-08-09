import { useState } from "react";
import { Lesson } from "../../../types";

type UseLessonMenuProps = {
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onCancel?: (lesson: Lesson) => void;
  onRestore?: (lesson: Lesson) => void;
  onReschedule?: (lesson: Lesson) => void;
};

export const useLessonMenu = ({
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
}: UseLessonMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    lesson: Lesson
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLesson(lesson);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLesson(null);
  };

  const handleEdit = () => {
    if (selectedLesson) {
      onEdit(selectedLesson);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedLesson) {
      onDelete(selectedLesson);
    }
    handleMenuClose();
  };

  const handleCancel = () => {
    if (selectedLesson && onCancel) {
      onCancel(selectedLesson);
    }
    handleMenuClose();
  };

  const handleRestore = () => {
    if (selectedLesson && onRestore) {
      onRestore(selectedLesson);
    }
    handleMenuClose();
  };

  const handleReschedule = () => {
    if (selectedLesson && onReschedule) {
      onReschedule(selectedLesson);
    }
    handleMenuClose();
  };

  return {
    anchorEl,
    selectedLesson,
    handleMenuClick,
    handleMenuClose,
    handleEdit,
    handleDelete,
    handleCancel,
    handleRestore,
    handleReschedule,
  };
};
