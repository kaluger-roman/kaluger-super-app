import type { FC } from "react";

import {
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { Chip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { Button, capitalizeFirst, formatDay } from "@shared";

import { CallButton } from "../../../videoCall";
import {
  formatLessonDuration,
  formatLessonTime,
  statusLabel,
  studentLessonDialogModel,
  subjectLabel,
} from "../../models";
import { statusChipColor } from "../StudentLessonCard";
import * as Styled from "./StudentLessonDialog.styled";

export const StudentLessonDialog: FC = () => {
  const lesson = useUnit(studentLessonDialogModel.$openedLesson);
  const tutorName = useUnit(studentLessonDialogModel.$tutorName);
  const actions = useUnit({
    close: studentLessonDialogModel.dialogClosed,
    call: studentLessonDialogModel.callRequested,
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!lesson) return null;

  return (
    <Styled.StyledDialog
      open
      onClose={() => actions.close()}
      maxWidth="xs"
      fullWidth
      aria-labelledby="student-lesson-dialog-title"
    >
      <Styled.Header>
        <Typography id="student-lesson-dialog-title" variant="h6">
          Урок
        </Typography>
        <Chip
          size="small"
          color={statusChipColor[lesson.status]}
          label={statusLabel(lesson.status)}
        />
      </Styled.Header>

      <Styled.Body>
        <Styled.Subject variant="h5">{subjectLabel(lesson.subject)}</Styled.Subject>
        <Styled.InfoRow>
          <EventIcon fontSize="small" />
          <Typography variant="body1" color="text.primary">
            {capitalizeFirst(formatDay(lesson.startTime))}
          </Typography>
        </Styled.InfoRow>
        <Styled.InfoRow>
          <ScheduleIcon fontSize="small" />
          <Typography variant="body1" color="text.primary">
            {formatLessonTime(lesson.startTime)}—{formatLessonTime(lesson.endTime)}
          </Typography>
          <Typography variant="body2">
            {formatLessonDuration(lesson.startTime, lesson.endTime)}
          </Typography>
        </Styled.InfoRow>
        {tutorName && (
          <Styled.InfoRow>
            <PersonIcon fontSize="small" />
            <Typography variant="body1" color="text.primary">
              {tutorName}
            </Typography>
          </Styled.InfoRow>
        )}
      </Styled.Body>

      <Styled.Actions $isMobile={isMobile}>
        <Button variant="outlined" fullWidth={isMobile} onClick={() => actions.close()}>
          Закрыть
        </Button>
        {tutorName && (
          <CallButton
            label="Позвонить"
            color="success"
            fullWidth={isMobile}
            onClick={() => actions.call()}
          />
        )}
      </Styled.Actions>
    </Styled.StyledDialog>
  );
};
