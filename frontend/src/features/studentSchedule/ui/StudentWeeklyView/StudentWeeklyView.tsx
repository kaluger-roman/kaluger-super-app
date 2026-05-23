import type { FC } from "react";

import type { StudentVisibleLesson } from "@shared";

import { groupLessonsByDay } from "../../models";
import { StudentLessonCard } from "../StudentLessonCard";
import * as Styled from "./StudentWeeklyView.styled";

type StudentWeeklyViewProps = {
  lessons: StudentVisibleLesson[];
};

export const StudentWeeklyView: FC<StudentWeeklyViewProps> = ({ lessons }) => {
  if (lessons.length === 0) {
    return (
      <Styled.EmptyContainer>
        <Styled.DayTitle variant="h6" color="text.secondary">
          На этой неделе уроков нет
        </Styled.DayTitle>
      </Styled.EmptyContainer>
    );
  }

  const groupedLessons = groupLessonsByDay(lessons);

  return (
    <Styled.Container>
      {Object.entries(groupedLessons).map(([day, dayLessons]) => (
        <Styled.DaySection key={day}>
          <Styled.DayTitle variant="h6">{day}</Styled.DayTitle>
          <Styled.LessonsColumn>
            {dayLessons.map((lesson) => (
              <StudentLessonCard key={lesson.id} lesson={lesson} />
            ))}
          </Styled.LessonsColumn>
        </Styled.DaySection>
      ))}
    </Styled.Container>
  );
};
