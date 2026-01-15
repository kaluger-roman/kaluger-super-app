import type { FC, MouseEvent } from "react";

import type { Lesson } from "@shared";

import { LessonCard } from "../LessonCard";
import * as Styled from "./WeeklyView.styled";

type WeeklyViewProps = {
  lessons: Lesson[];
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
  onCardClick?: (lesson: Lesson) => void;
  onMenuClick?: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
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
    dayLessons.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  return groups;
};

export const WeeklyView: FC<WeeklyViewProps> = ({ lessons, onCardClick, onMenuClick }) => {
  const groupedLessons = groupLessonsByDay(lessons);

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
