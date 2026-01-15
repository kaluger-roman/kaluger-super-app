import type { FC } from "react";

import { Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { lessonsModel } from "@features/lessons";

import {
  LessonsTabs,
  AddLessonFab,
  LessonsContent,
  LessonsDialogs,
  LessonsFilters,
  ViewModeToggle,
} from "./components";
import * as Styled from "./LessonsPage.styled";

export const LessonsPage: FC = () => {
  useGate(lessonsModel.LessonsPageGate);

  const lessonsViewMode = useUnit(lessonsModel.$lessonsViewMode);
  const currentTab = useUnit(lessonsModel.$currentTab);

  return (
    <Styled.StyledContainer maxWidth="lg">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h3" component="h1" gutterBottom>
          📅 Уроки
        </Styled.StyledTitle>
        <Typography variant="h6" color="text.secondary">
          Управление расписанием и занятиями
        </Typography>
        <Styled.ControlsBox>
          <ViewModeToggle />
          {lessonsViewMode !== "schedule" && <LessonsFilters />}
        </Styled.ControlsBox>
      </Styled.HeaderBox>

      {lessonsViewMode !== "schedule" && <LessonsTabs />}

      <LessonsContent currentTab={currentTab} />

      <AddLessonFab onClick={() => lessonsModel.dialogOpened(undefined)} />

      <LessonsDialogs />
    </Styled.StyledContainer>
  );
};
