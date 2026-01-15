import type { FC, MouseEvent } from "react";

import type { Lesson } from "@shared";

import { LessonCard } from "../LessonCard";
import * as Styled from "./LessonsDay.styled";

type LessonsDayProps = {
  day: string;
  lessons: Lesson[];
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
};

export const LessonsDay: FC<LessonsDayProps> = ({ day, lessons, onCardClick, onMenuClick }) => {
  return (
    <Styled.DayContainer>
      <Styled.DayTitle variant="subtitle1">{day}</Styled.DayTitle>
      <Styled.LessonsContainer>
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onCardClick={onCardClick}
            onMenuClick={onMenuClick}
          />
        ))}
      </Styled.LessonsContainer>
    </Styled.DayContainer>
  );
};
