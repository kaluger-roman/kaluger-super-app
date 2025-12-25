import type { FC, MouseEvent } from "react";

import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Typography, Chip, IconButton } from "@mui/material";

import * as Styled from "./LessonCard.styled";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../../../constants";
import { formatTimeFromString, getStatusColor, getStatusLabel } from "../../../../lib";
import type { Lesson } from "../../../../types";
import { RecurringLessonBadge } from "../../../RecurringLessonBadge";
import { LessonStatusIcons } from "../LessonStatusIcons";

type LessonCardProps = {
  lesson: Lesson;
  onCardClick?: (lesson: Lesson) => void;
  onMenuClick?: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
};
export const LessonCard: FC<LessonCardProps> = ({
  lesson,
  onCardClick,
  onMenuClick,
  onPaymentChange,
  onHomeworkSentChange,
}) => {
  return (
    <Styled.StyledCard
      variant="outlined"
      onClick={onCardClick ? () => onCardClick(lesson) : undefined}
    >
      <Styled.StyledCardContent>
        <Styled.HeaderRow>
          <Styled.ContentColumn>
            <Styled.TitleRow>
              <Styled.StudentName variant="h6">{lesson.student?.name}</Styled.StudentName>
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

            <Styled.BottomRow>
              <Typography variant="body2" color="text.secondary">
                📚 {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
              </Typography>

              <LessonStatusIcons
                lesson={lesson}
                onPaymentChange={onPaymentChange}
                onHomeworkSentChange={onHomeworkSentChange}
              />
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
