import type { FC } from "react";

import { Box, Typography, Divider } from "@mui/material";

import {
  SUBJECT_LABELS,
  LESSON_TYPE_LABELS,
  formatDateTimeLong,
  formatDate,
  StudentName,
} from "@shared";
import type { Lesson } from "@shared";

import * as Styled from "./LessonDetails.styled";
import { HomeworkSentStatus } from "../../HomeworkSentStatus";
import { PaymentStatus } from "../../PaymentStatus";

type LessonDetailsProps = {
  lesson: Lesson;
};

export const LessonDetails: FC<LessonDetailsProps> = ({ lesson }) => {
  return (
    <Styled.Container>
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="h6">👤</Typography>
          <StudentName student={lesson.student} variant="h6" />
        </Box>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          📚 {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
        </Typography>
        <Typography variant="body1" gutterBottom>
          💰 {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
        </Typography>
        <Styled.PaymentStatusBox>
          <PaymentStatus lesson={lesson} />
        </Styled.PaymentStatusBox>
        {lesson.isPaid && lesson.paymentDate && (
          <Typography variant="body2" color="success.main" gutterBottom>
            💳 Оплачено: {formatDate(lesson.paymentDate)}
          </Typography>
        )}
        <HomeworkSentStatus needConfirm lesson={lesson} />
      </Box>

      <Divider />
      <Box>
        <Styled.SectionTitle variant="subtitle2">📅 Время</Styled.SectionTitle>
        <Typography variant="body2" color="text.secondary">
          Начало: {formatDateTimeLong(lesson.startTime)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Окончание: {formatDateTimeLong(lesson.endTime)}
        </Typography>
      </Box>
      {lesson.description && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">📝 Описание</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.description}
          </Typography>
        </Box>
      )}
      {lesson.homework && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">📖 Домашнее задание</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.homework}
          </Typography>
        </Box>
      )}
      {lesson.notes && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">🗒️ Заметки</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.notes}
          </Typography>
        </Box>
      )}
      {lesson.grade && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">⭐ Оценка</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.grade} из 5
          </Typography>
        </Box>
      )}
    </Styled.Container>
  );
};
