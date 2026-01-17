import type { FC } from "react";

import { Menu } from "@mui/material";

import type { Lesson } from "@shared";

import * as Styled from "./LessonContextMenu.styled";
import { lessonsModel, lessonCancellationModel } from "../../../models";

type LessonContextMenuProps = {
  anchorEl: HTMLElement | null;
  selectedLesson: Lesson;
  onClose: () => void;
};

export const LessonContextMenu: FC<LessonContextMenuProps> = ({
  anchorEl,
  selectedLesson,
  onClose,
}) => {
  const withClose = (action: (lesson: Lesson) => void, lesson: Lesson) => {
    action(lesson);
    onClose();
  };

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <Styled.StyledMenuItem onClick={() => withClose(lessonsModel.dialogOpened, selectedLesson)}>
        <Styled.StyledEditIcon />
        Редактировать
      </Styled.StyledMenuItem>
      {selectedLesson?.status !== "CANCELLED" && (
        <Styled.StyledMenuItem
          onClick={() => withClose(lessonsModel.rescheduleDialogOpened, selectedLesson)}
        >
          <Styled.StyledRescheduleIcon />
          Перенести урок
        </Styled.StyledMenuItem>
      )}
      {selectedLesson?.status !== "CANCELLED" && (
        <Styled.StyledMenuItem
          onClick={() => withClose(lessonCancellationModel.lessonCancelRequested, selectedLesson)}
        >
          <Styled.StyledCancelIcon />
          Отменить урок
        </Styled.StyledMenuItem>
      )}
      {selectedLesson?.status === "CANCELLED" && (
        <Styled.StyledMenuItem
          onClick={() => withClose(lessonsModel.lessonRestoreRequested, selectedLesson)}
        >
          <Styled.StyledRestoreIcon />
          Восстановить урок
        </Styled.StyledMenuItem>
      )}
      <Styled.DeleteMenuItem
        onClick={() => withClose(lessonsModel.deleteDialogOpened, selectedLesson)}
      >
        <Styled.StyledDeleteIcon />
        Удалить
      </Styled.DeleteMenuItem>
    </Menu>
  );
};
