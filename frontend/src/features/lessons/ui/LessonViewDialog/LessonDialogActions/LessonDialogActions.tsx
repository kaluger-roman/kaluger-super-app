import type { FC } from "react";

import {
  Edit as EditIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Schedule as RescheduleIcon,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import { useUnit } from "effector-react";

import type { Lesson } from "@shared";
import { rescheduleDialogModel } from "@shared/ui";

import * as Styled from "./LessonDialogActions.styled";
import { lessonsModel } from "../../../models";

type LessonDialogActionsProps = {
  lesson: Lesson;
  isMobile: boolean;
};

export const LessonDialogActions: FC<LessonDialogActionsProps> = ({ lesson, isMobile }) => {
  const actions = useUnit({
    openCancelConfirmForLesson: lessonsModel.openCancelConfirmForLesson,
    openRestoreConfirmForLesson: lessonsModel.openRestoreConfirmForLesson,
    openDeleteConfirmForLesson: lessonsModel.openDeleteConfirmForLesson,
    editFromViewRequested: lessonsModel.editFromViewRequested,
    viewDialogClosed: lessonsModel.viewDialogClosed,
  });

  return (
    <Styled.Container $isMobile={isMobile}>
      {/* Первый столбец: действия с уроком */}
      <Styled.ActionsColumn>
        {lesson.status !== "CANCELLED" && (
          <Button
            onClick={() => rescheduleDialogModel.rescheduleDialogOpened(lesson)}
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
            onClick={() => actions.openCancelConfirmForLesson(lesson)}
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
            onClick={() => actions.openRestoreConfirmForLesson(lesson)}
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
          onClick={() => actions.openDeleteConfirmForLesson(lesson)}
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          fullWidth
        >
          Удалить
        </Button>
      </Styled.ActionsColumn>

      {/* Второй столбец: закрыть и редактировать */}
      <Styled.CloseEditColumn $isMobile={isMobile}>
        <Button onClick={actions.viewDialogClosed} variant="outlined" fullWidth>
          Закрыть
        </Button>
        <Button
          onClick={actions.editFromViewRequested}
          variant="contained"
          startIcon={<EditIcon />}
          fullWidth
        >
          Редактировать
        </Button>
      </Styled.CloseEditColumn>
    </Styled.Container>
  );
};
