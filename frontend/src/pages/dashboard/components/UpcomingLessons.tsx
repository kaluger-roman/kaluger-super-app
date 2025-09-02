import React from "react";
import { Paper, Typography, Box, Card, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Lesson } from "../../../shared/types";
import { formatLessonTime } from "./utils";

type UpcomingLessonsProps = {
  lessons: Lesson[];
};

export const UpcomingLessons = ({ lessons }: UpcomingLessonsProps) => {
  const navigate = useNavigate();

  if (lessons.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        📅 Ближайшие уроки
      </Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {lessons.slice(0, 3).map((lesson) => (
          <Card key={lesson.id} variant="outlined" sx={{ p: 1.5 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {lesson.student?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatLessonTime(lesson.startTime, lesson.endTime)}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
      <Button
        variant="text"
        onClick={() => navigate("/lessons")}
        sx={{ mt: 1 }}
      >
        Посмотреть все уроки
      </Button>
    </Paper>
  );
};
