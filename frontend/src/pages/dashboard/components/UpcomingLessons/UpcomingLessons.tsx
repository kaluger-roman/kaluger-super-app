import { Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { formatLessonTime, getLessonDisplayName } from "@shared";
import type { Lesson } from "@shared/types";

import * as Styled from "./UpcomingLessons.styled";

type UpcomingLessonsProps = {
  lessons: Lesson[];
};

export const UpcomingLessons = ({ lessons }: UpcomingLessonsProps) => {
  const navigate = useNavigate();

  if (lessons.length === 0) {
    return null;
  }

  return (
    <Styled.Container>
      <Styled.Title variant="h6" gutterBottom>
        📅 Ближайшие уроки
      </Styled.Title>
      <Styled.LessonsContainer>
        {lessons.slice(0, 3).map((lesson) => (
          <Styled.LessonCard key={lesson.id} variant="outlined">
            <Styled.LessonCardContent>
              <Box>
                <Styled.StudentName variant="subtitle2">{getLessonDisplayName(lesson)}</Styled.StudentName>
                <Typography variant="body2" color="text.secondary">
                  {formatLessonTime(lesson.startTime, lesson.endTime)}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Styled.LessonPrice variant="body2">
                  {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
                </Styled.LessonPrice>
              </Box>
            </Styled.LessonCardContent>
          </Styled.LessonCard>
        ))}
      </Styled.LessonsContainer>
      <Styled.ViewAllButton variant="text" onClick={() => navigate("/lessons")}>
        Посмотреть все уроки
      </Styled.ViewAllButton>
    </Styled.Container>
  );
};
