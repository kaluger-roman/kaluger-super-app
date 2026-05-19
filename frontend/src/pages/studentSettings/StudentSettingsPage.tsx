import type { FC } from "react";

import { Typography } from "@mui/material";

import { StudentInfoSection, TutorInfoSection } from "@features";

import * as Styled from "./StudentSettingsPage.styled";

export const StudentSettingsPage: FC = () => {
  return (
    <Styled.RootBox>
      <Typography variant="h5" component="h1" fontWeight={600}>
        Настройки
      </Typography>
      <StudentInfoSection />
      <TutorInfoSection />
    </Styled.RootBox>
  );
};
