import { memo, useCallback } from "react";
import type { MouseEvent } from "react";

import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Typography, Chip, IconButton } from "@mui/material";

import {
  SUBJECT_LABELS,
  LESSON_TYPE_LABELS,
  formatTimeFromString,
  getLessonDisplayName,
  getStatusColor,
  getStatusLabel,
  formatDate,
  RecurringLessonBadge,
  LessonStudentName,
} from "@shared";
import type { Lesson } from "@shared";

import * as Styled from "./LessonCard.styled";
import { LessonStatusIcons } from "../../../LessonStatusIcons";
import { LessonNotes, hasVisibleNotes } from "../LessonNotes";

type LessonCardProps = {
  lesson: Lesson;
  onCardClick?: (lesson: Lesson) => void;
  onMenuClick?: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
};

export const LessonCard = memo<LessonCardProps>(({ lesson, onCardClick, onMenuClick }) => {
  const handleCardClick = useCallback(() => {
    onCardClick?.(lesson);
  }, [onCardClick, lesson]);

  const handleMenuClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onMenuClick?.(event, lesson);
    },
    [onMenuClick, lesson]
  );

  return (
    <Styled.StyledCard
      variant="outlined"
      onClick={onCardClick ? handleCardClick : undefined}
    >
      <Styled.StyledCardContent>
        <Styled.HeaderRow>
          <Styled.ContentColumn>
            <Styled.TitleRow>
              <LessonStudentName
                lesson={lesson}
                variant="h6"
                component={
                  <Styled.StudentName variant="h6">
                    {getLessonDisplayName(lesson)}
                  </Styled.StudentName>
                }
              />
              <Chip
                label={getStatusLabel(lesson.status)}
                color={getStatusColor(lesson.status)}
                size="small"
              />
              {lesson.isRecurring && <RecurringLessonBadge size="small" variant="chip" />}
            </Styled.TitleRow>

            <Styled.InfoRow>
              <Typography variant="body2" color="text.secondary">
                ⏰ {formatTimeFromString(lesson.startTime)} - {formatTimeFromString(lesson.endTime)}
              </Typography>
              <Styled.PriceText variant="body2">
                💰 {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
              </Styled.PriceText>
            </Styled.InfoRow>

            {lesson.isPaid && lesson.paymentDate && (
              <Typography variant="caption" color="success.main">
                💳 Оплачено: {formatDate(lesson.paymentDate)}
              </Typography>
            )}

            <Styled.BottomRow>
              <Typography variant="body2" color="text.secondary">
                📚 {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
              </Typography>

              <LessonStatusIcons lesson={lesson} />
            </Styled.BottomRow>

            {hasVisibleNotes(lesson.notes) && (
              <LessonNotes notes={lesson.notes} />
            )}
          </Styled.ContentColumn>

          {onMenuClick && (
            <IconButton
              size="small"
              aria-label="Меню урока"
              onClick={handleMenuClick}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Styled.HeaderRow>
      </Styled.StyledCardContent>
    </Styled.StyledCard>
  );
});

LessonCard.displayName = "LessonCard";
