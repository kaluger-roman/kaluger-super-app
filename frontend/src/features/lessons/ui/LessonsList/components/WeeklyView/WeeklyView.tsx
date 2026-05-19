import type { FC, MouseEvent } from "react";

import type { Lesson } from "@shared";
import { groupByDay } from "@shared";

import type { LessonListType } from "../../LessonsList.types";
import { LessonCard } from "../LessonCard";
import * as Styled from "./WeeklyView.styled";

type WeeklyViewProps = {
  lessons: Lesson[];
  type: LessonListType;
  onCardClick?: (lesson: Lesson) => void;
  onMenuClick?: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
};

export const WeeklyView: FC<WeeklyViewProps> = ({ lessons, onCardClick, onMenuClick }) => {
  const groupedLessons = groupByDay(lessons, (lesson) => lesson.startTime);

  if (lessons.length === 0) {
    return (
      <Styled.EmptyContainer>
        <Styled.DayTitle variant="h6" color="text.secondary">
          На этой неделе уроков нет
        </Styled.DayTitle>
      </Styled.EmptyContainer>
    );
  }

  return (
    <Styled.Container>
      {Object.entries(groupedLessons).map(([day, dayLessons]) => (
        <Styled.DaySection key={day}>
          <Styled.DayTitle variant="h6">{day}</Styled.DayTitle>
          <Styled.LessonsColumn>
            {dayLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onCardClick={onCardClick}
                onMenuClick={onMenuClick}
              />
            ))}
          </Styled.LessonsColumn>
        </Styled.DaySection>
      ))}
    </Styled.Container>
  );
};
