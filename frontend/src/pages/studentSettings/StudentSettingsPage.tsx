import type { FC } from "react";

import { Typography } from "@mui/material";
import { useGate } from "effector-react";

import {
  CallNotificationsSection,
  StudentInfoSection,
  TutorInfoSection,
  callNotificationsModel,
} from "@features";

import * as Styled from "./StudentSettingsPage.styled";

export const StudentSettingsPage: FC = () => {
  useGate(callNotificationsModel.CabinetGate);

  return (
    <Styled.RootBox>
      <Typography variant="h5" component="h1" fontWeight={600}>
        Настройки
      </Typography>
      <StudentInfoSection />
      <TutorInfoSection />
      <CallNotificationsSection />
    </Styled.RootBox>
  );
};
