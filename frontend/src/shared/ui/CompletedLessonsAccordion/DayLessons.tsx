import { Typography, Box } from "@mui/material";
import { LessonCard } from "./LessonCard";
import { DayLessonsProps } from "./types";

export const DayLessons = ({ day, lessons, onMenuClick }: DayLessonsProps) => {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1,
          fontWeight: 600,
          textTransform: "capitalize",
        }}
      >
        {day}
      </Typography>
      {lessons.map((lesson) => (
        <LessonCard key={lesson.id} lesson={lesson} onMenuClick={onMenuClick} />
      ))}
    </Box>
  );
};
