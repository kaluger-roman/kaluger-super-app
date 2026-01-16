import type { FC, MouseEvent } from "react";

import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Typography, Chip, IconButton } from "@mui/material";

import {
  SUBJECT_LABELS,
  LESSON_TYPE_LABELS,
  formatTimeFromString,
  getStatusColor,
  getStatusLabel,
  formatDate,
  RecurringLessonBadge,
  StudentName,
} from "@shared";
import type { Lesson } from "@shared";

import * as Styled from "./LessonCard.styled";
import { LessonStatusIcons } from "../../../LessonStatusIcons";

type LessonCardProps = {
  lesson: Lesson;
  onCardClick?: (lesson: Lesson) => void;
  onMenuClick?: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
};
export const LessonCard: FC<LessonCardProps> = ({ lesson, onCardClick, onMenuClick }) => {
  return (
    <Styled.StyledCard
      variant="outlined"
      onClick={onCardClick ? () => onCardClick(lesson) : undefined}
    >
      <Styled.StyledCardContent>
        <Styled.HeaderRow>
          <Styled.ContentColumn>
            <Styled.TitleRow>
              <StudentName
                student={lesson.student}
                variant="h6"
                component={
                  <Styled.StudentName variant="h6">{lesson.student?.name}</Styled.StudentName>
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
          </Styled.ContentColumn>

          {onMenuClick && (
            <IconButton size="small" onClick={(e) => onMenuClick(e, lesson)}>
              <MoreVertIcon />
            </IconButton>
          )}
        </Styled.HeaderRow>
      </Styled.StyledCardContent>
    </Styled.StyledCard>
  );
};
