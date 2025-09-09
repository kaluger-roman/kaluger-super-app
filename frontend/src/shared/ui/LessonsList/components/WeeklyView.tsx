import React from "react";
import { Box, Typography } from "@mui/material";
import { Lesson } from "../../../types";
import { LessonCard } from "./LessonCard";

type WeeklyViewProps = {
  lessons: Lesson[];
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  onCardClick?: (lesson: Lesson) => void;
  onMenuClick?: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
};

const groupLessonsByDay = (lessons: Lesson[]) => {
  const groups: { [key: string]: Lesson[] } = {};

  lessons.forEach((lesson) => {
    const date = new Date(lesson.startTime);
    const dayKey = date.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }
    groups[dayKey].push(lesson);
  });

  Object.values(groups).forEach((dayLessons) => {
    dayLessons.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  });

  return groups;
};

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  lessons,
  onPaymentChange,
  onHomeworkSentChange,
  onCardClick,
  onMenuClick,
}) => {
  const groupedLessons = groupLessonsByDay(lessons);

  if (lessons.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          На этой неделе уроков нет
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {Object.entries(groupedLessons).map(([day, dayLessons]) => (
        <Box key={day} mb={3}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 1,
              pb: 1,
              borderColor: "divider",
              textTransform: "capitalize",
            }}
          >
            {day}
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {dayLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onCardClick={onCardClick || (() => {})}
                onMenuClick={(e, l) => {
                  e.stopPropagation();
                  if (onMenuClick) onMenuClick(e, l);
                }}
                onPaymentChange={onPaymentChange || (() => {})}
                onHomeworkSentChange={onHomeworkSentChange}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
