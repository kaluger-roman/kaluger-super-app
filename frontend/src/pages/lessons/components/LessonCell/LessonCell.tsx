import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import type { Lesson } from "@shared";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS, getLessonDisplayName, getStatusLabel, formatTimeForCell } from "@shared";

import * as Styled from "./LessonCell.styled";

type LessonCellProps = {
  lesson: Lesson;
  onClick: (lesson: Lesson) => void;
  compact?: boolean;
};

export const LessonCell: FC<LessonCellProps> = ({ lesson, onClick, compact = false }) => {
  const startTime = new Date(lesson.startTime);
  const endTime = new Date(lesson.endTime);

  if (compact) {
    return (
      <Styled.LessonCard $status={lesson.status} $compact onClick={() => onClick(lesson)}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Styled.StyledCaption variant="caption" noWrap>
            {lesson.price ? `${lesson.price}₽ ` : ""}
            {getLessonDisplayName(lesson)}
          </Styled.StyledCaption>
          {lesson.student?.archived && (
            <Styled.StyledCaption variant="caption" color="text.secondary">
              📦
            </Styled.StyledCaption>
          )}
        </Box>
      </Styled.LessonCard>
    );
  }

  return (
    <Styled.LessonCard $status={lesson.status} onClick={() => onClick(lesson)}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="caption" fontWeight="bold">
          {formatTimeForCell(startTime)}-{formatTimeForCell(endTime)}
        </Typography>
        <Styled.StatusChip label={getStatusLabel(lesson.status)} size="small" variant="outlined" />
      </Box>

      <Box display="flex" alignItems="center" gap={0.5}>
        <Typography variant="body2" fontWeight="medium" noWrap>
          {getLessonDisplayName(lesson)}
        </Typography>
        {lesson.student?.archived && (
          <Typography variant="caption" color="text.secondary">
            📦
          </Typography>
        )}
      </Box>

      <Typography variant="caption" noWrap>
        {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
      </Typography>

      {lesson.price != null && lesson.price > 0 && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
          <Typography variant="caption" fontWeight="bold">
            {lesson.price}₽
          </Typography>
          {!lesson.isPaid && (
            <Styled.UnpaidChip label="Не оплачен" size="small" color="error" variant="outlined" />
          )}
        </Box>
      )}
    </Styled.LessonCard>
  );
};
