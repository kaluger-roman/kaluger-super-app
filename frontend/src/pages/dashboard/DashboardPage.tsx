import type { FC } from "react";

import { useUnit } from "effector-react";

import { lessonModel, studentModel } from "@entities";

import { QuickActions, UpcomingLessons, StudentsOverview } from "./components";
import * as Styled from "./DashboardPage.styled";

export const DashboardPage: FC = () => {
  const upcomingLessons = useUnit(lessonModel.$upcomingLessons);
  const students = useUnit(studentModel.$students);

  return (
    <Styled.StyledContainer maxWidth="lg">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h3" component="h1" gutterBottom>
          📊 Главная
        </Styled.StyledTitle>
      </Styled.HeaderBox>

      <QuickActions studentsCount={students.length} />
      <UpcomingLessons lessons={upcomingLessons} />
      <StudentsOverview students={students} />
    </Styled.StyledContainer>
  );
};
