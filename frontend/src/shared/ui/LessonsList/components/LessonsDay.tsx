import React from "react";
import { Box, Typography } from "@mui/material";
import { Lesson } from "../../../types";
import { LessonCard } from "./LessonCard";

type LessonsDayProps = {
  day: string;
  lessons: Lesson[];
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
};

export const LessonsDay: React.FC<LessonsDayProps> = ({
  day,
  lessons,
  onCardClick,
  onMenuClick,
  onPaymentChange,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{
          mb: 1.5,
          fontWeight: 600,
          textTransform: "capitalize",
          color: "text.secondary",
          fontSize: "0.95rem",
        }}
      >
        {day}
      </Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onCardClick={onCardClick}
            onMenuClick={onMenuClick}
            onPaymentChange={onPaymentChange}
          />
        ))}
      </Box>
    </Box>
  );
};
