import React from "react";
import { Box, Typography, Divider } from "@mui/material";
import { SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../../../../shared";
import { PaymentStatus, HomeworkSentStatus } from "../../../../shared/ui";
import { formatDateTime } from "./utils";
import type { Lesson } from "../../../../shared";

type LessonDetailsProps = {
  lesson: Lesson;
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
};

export const LessonDetails: React.FC<LessonDetailsProps> = ({
  lesson,
  onPaymentChange,
  onHomeworkSentChange,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Основная информация */}
      <Box>
        <Typography variant="h6" gutterBottom>
          👤 {lesson.student?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          📚 {SUBJECT_LABELS[lesson.subject]} •{" "}
          {LESSON_TYPE_LABELS[lesson.lessonType]}
        </Typography>
        <Typography variant="body1" gutterBottom>
          💰 {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
        </Typography>
        {onPaymentChange && (
          <Box sx={{ mt: 1 }}>
            <PaymentStatus lesson={lesson} onPaymentChange={onPaymentChange} />
          </Box>
        )}
        {onHomeworkSentChange && (
          <HomeworkSentStatus
            lesson={lesson}
            onHomeworkSentChange={onHomeworkSentChange}
          />
        )}
      </Box>

      <Divider />

      {/* Время */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          📅 Время
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Начало: {formatDateTime(lesson.startTime)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Окончание: {formatDateTime(lesson.endTime)}
        </Typography>
      </Box>

      {/* Описание */}
      {lesson.description && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            📝 Описание
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lesson.description}
          </Typography>
        </Box>
      )}

      {/* Домашнее задание */}
      {lesson.homework && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            📖 Домашнее задание
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lesson.homework}
          </Typography>
        </Box>
      )}

      {/* Заметки */}
      {lesson.notes && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            🗒️ Заметки
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lesson.notes}
          </Typography>
        </Box>
      )}

      {/* Оценка */}
      {lesson.grade && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            ⭐ Оценка
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lesson.grade} из 5
          </Typography>
        </Box>
      )}
    </Box>
  );
};
