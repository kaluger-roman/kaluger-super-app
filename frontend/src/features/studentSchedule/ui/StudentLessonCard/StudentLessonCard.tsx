import type { FC } from "react";

import { Typography } from "@mui/material";

import type { StudentVisibleLesson } from "@shared";

import { statusChipColor } from "./StudentLessonCard.constants";
import * as Styled from "./StudentLessonCard.styled";
import {
  formatLessonDuration,
  formatLessonTime,
  statusLabel,
  subjectLabel,
} from "../../models";

type StudentLessonCardProps = {
  lesson: StudentVisibleLesson;
};

export const StudentLessonCard: FC<StudentLessonCardProps> = ({ lesson }) => {
  return (
    <Styled.StyledCard variant="outlined" $status={lesson.status}>
      <Styled.HeaderRow>
        <Styled.SubjectText variant="subtitle1">
          {subjectLabel(lesson.subject)}
        </Styled.SubjectText>
        <Styled.StatusChip
          size="small"
          color={statusChipColor[lesson.status]}
          label={statusLabel(lesson.status)}
        />
      </Styled.HeaderRow>
      <Styled.TimeRow>
        <Typography variant="body2" color="text.secondary">
          {formatLessonTime(lesson.startTime)}—{formatLessonTime(lesson.endTime)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          • {formatLessonDuration(lesson.startTime, lesson.endTime)}
        </Typography>
      </Styled.TimeRow>
    </Styled.StyledCard>
  );
};
