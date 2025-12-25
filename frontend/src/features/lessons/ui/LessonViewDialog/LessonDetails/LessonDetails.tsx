import type { FC } from "react";

import { Box, Typography, Divider } from "@mui/material";
import { useUnit } from "effector-react";

import { SUBJECT_LABELS, LESSON_TYPE_LABELS, formatDateTimeLong } from "@shared";
import type { Lesson } from "@shared";
import { PaymentStatus, HomeworkSentStatus } from "@shared/ui";

import * as Styled from "./LessonDetails.styled";
import { lessonsModel } from "../../../models";

type LessonDetailsProps = {
  lesson: Lesson;
};

export const LessonDetails: FC<LessonDetailsProps> = ({ lesson }) => {
  const actions = useUnit({
    lessonPaymentChanged: lessonsModel.lessonPaymentChanged,
    lessonHomeworkSentChanged: lessonsModel.lessonHomeworkSentChanged,
  });

  const handlePaymentChange = (lessonId: string, isPaid: boolean) => {
    actions.lessonPaymentChanged({ lessonId, isPaid });
  };

  const handleHomeworkSentChange = (lessonId: string, isSent: boolean) => {
    actions.lessonHomeworkSentChanged({ lessonId, isSent });
  };
  return (
    <Styled.Container>
      {/* Основная информация */}
      <Box>
        <Typography variant="h6" gutterBottom>
          👤 {lesson.student?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          📚 {SUBJECT_LABELS[lesson.subject]} • {LESSON_TYPE_LABELS[lesson.lessonType]}
        </Typography>
        <Typography variant="body1" gutterBottom>
          💰 {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
        </Typography>
        <Styled.PaymentStatusBox>
          <PaymentStatus needConfirm lesson={lesson} onPaymentChange={handlePaymentChange} />
        </Styled.PaymentStatusBox>
        <HomeworkSentStatus
          needConfirm
          lesson={lesson}
          onHomeworkSentChange={handleHomeworkSentChange}
        />
      </Box>

      <Divider />

      {/* Время */}
      <Box>
        <Styled.SectionTitle variant="subtitle2">📅 Время</Styled.SectionTitle>
        <Typography variant="body2" color="text.secondary">
          Начало: {formatDateTimeLong(lesson.startTime)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Окончание: {formatDateTimeLong(lesson.endTime)}
        </Typography>
      </Box>

      {/* Описание */}
      {lesson.description && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">📝 Описание</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.description}
          </Typography>
        </Box>
      )}

      {/* Домашнее задание */}
      {lesson.homework && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">📖 Домашнее задание</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.homework}
          </Typography>
        </Box>
      )}

      {/* Заметки */}
      {lesson.notes && (
        <Box>
          <Styled.SectionTitle variant="subtitle2">🗒️ Заметки</Styled.SectionTitle>
          <Typography variant="body2" color="text.secondary">
            {lesson.notes}
          </Typography>
        </Box>
      )}

      {/* Оценка */}
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
