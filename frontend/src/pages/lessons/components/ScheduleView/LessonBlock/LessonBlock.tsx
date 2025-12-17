import React from "react";
import { Box } from "@mui/material";
import type { Lesson } from "../../../../../shared";
import { LessonCell } from "../../LessonCell";

type LessonBlockProps = {
  lesson: Lesson;
  lessonIndex: number;
  startHour: number;
  activeCellHeight: number;
  onLessonClick: (lesson: Lesson) => void;
  compact?: boolean;
};

export const LessonBlock: React.FC<LessonBlockProps> = ({
  lesson,
  lessonIndex,
  startHour,
  activeCellHeight,
  onLessonClick,
  compact = false,
}) => {
  const start = new Date(lesson.startTime);
  const end = new Date(lesson.endTime);
  const minutesFromStartHour =
    (start.getHours() - startHour) * 60 + start.getMinutes();
  const durationMinutes = Math.max(
    15,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  const topPx = (minutesFromStartHour / 60) * activeCellHeight;
  const heightPx = (durationMinutes / 60) * activeCellHeight;

  return (
    <Box
      key={lesson.id}
      position="absolute"
      top={topPx}
      left={0}
      right={0}
      height={Math.max(24, heightPx)}
      zIndex={10 + (lessonIndex % 5)}
      onClick={() => onLessonClick(lesson)}
    >
      <LessonCell lesson={lesson} onClick={onLessonClick} compact={compact} />
    </Box>
  );
};
