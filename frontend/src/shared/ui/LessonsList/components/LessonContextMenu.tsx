import type { FC } from "react";

import { Menu } from "@mui/material";

import * as Styled from "./LessonContextMenu.styled";
import type { Lesson } from "../../../types";


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

export const LessonContextMenu: FC<LessonContextMenuProps> = ({
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
        <Styled.StyledMenuItem onClick={onEdit}>
          <Styled.StyledEditIcon />
          Редактировать
        </Styled.StyledMenuItem>
      )}
      {onReschedule && selectedLesson?.status !== "CANCELLED" && (
        <Styled.StyledMenuItem onClick={onReschedule}>
          <Styled.StyledRescheduleIcon />
          Перенести урок
        </Styled.StyledMenuItem>
      )}
      {selectedLesson?.status !== "CANCELLED" && onCancel && (
        <Styled.StyledMenuItem onClick={onCancel}>
          <Styled.StyledCancelIcon />
          Отменить урок
        </Styled.StyledMenuItem>
      )}
      {selectedLesson?.status === "CANCELLED" && onRestore && (
        <Styled.StyledMenuItem onClick={onRestore}>
          <Styled.StyledRestoreIcon />
          Восстановить урок
        </Styled.StyledMenuItem>
      )}
      <Styled.DeleteMenuItem onClick={onDelete}>
        <Styled.StyledDeleteIcon />
        Удалить
      </Styled.DeleteMenuItem>
    </Menu>
  );
};
