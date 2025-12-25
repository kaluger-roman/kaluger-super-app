import type { ChangeEvent, FC, KeyboardEvent } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Switch,
} from "@mui/material";
import { useUnit } from "effector-react";

import * as homeworkSentStatusModel from "./homework-sent-status.model";
import * as Styled from "./HomeworkSentStatus.styled";
import type { Lesson } from "../../types";

type HomeworkSentStatusProps = {
  lesson: Lesson;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  size?: "small" | "medium";
  showLabel?: boolean;
  needConfirm?: boolean;
};

export const HomeworkSentStatus: FC<HomeworkSentStatusProps> = ({
  lesson,
  onHomeworkSentChange,
  size = "medium",
  showLabel = true,
  needConfirm = false,
}) => {
  const confirmOpen = useUnit(homeworkSentStatusModel.$isOpen);
  const pendingStatus = useUnit(homeworkSentStatusModel.$pendingStatus);

  const handleToggle = (newStatus: boolean) => {
    if (needConfirm) {
      homeworkSentStatusModel.confirmDialogOpened(newStatus);
    } else {
      onHomeworkSentChange?.(lesson.id, newStatus);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus !== null) {
      onHomeworkSentChange?.(lesson.id, pendingStatus);
    }
    homeworkSentStatusModel.confirmDialogClosed();
  };

  const handleCancel = () => {
    homeworkSentStatusModel.confirmDialogClosed();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    }
  };

  return (
    <>
      <Styled.StyledFormControlLabel
        onClick={(e) => e.stopPropagation()}
        $isHomeworkSent={!!lesson.isHomeworkSentByTeacher}
        control={
          <Switch
            checked={!!lesson.isHomeworkSentByTeacher}
            onChange={(_e: ChangeEvent<HTMLInputElement>, next: boolean) => handleToggle(next)}
            size={size}
            color={lesson.isHomeworkSentByTeacher ? "success" : "error"}
          />
        }
        label={
          showLabel
            ? lesson.isHomeworkSentByTeacher
              ? "ДЗ отправлено"
              : "ДЗ не отправлено"
            : undefined
        }
      />

      <Dialog
        onClick={(e) => e.stopPropagation()}
        open={confirmOpen}
        onClose={handleCancel}
        maxWidth="sm"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle>
          {pendingStatus ? "Отметить ДЗ как отправленное" : "Отметить ДЗ как неотправленное"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography>
              Вы уверены, что хотите отметить домашнее задание как{" "}
              <strong>{pendingStatus ? "отправленное" : "неотправленное"}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Урок: <strong>{lesson.student?.name}</strong>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Отмена</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={pendingStatus ? "primary" : "warning"}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
