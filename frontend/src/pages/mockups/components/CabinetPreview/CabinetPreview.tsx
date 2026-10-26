import type { FC } from "react";

import { Typography } from "@mui/material";

import { CallNotificationsCard, StudentWeeklyView } from "@features";

import { MockFrame } from "../MockFrame";

// Mirrors StudentSchedulePage, the cabinet's landing tab, where the invite card lives.
export const CabinetPreview: FC = () => (
  <MockFrame title="Кабинет ученика">
    <CallNotificationsCard />
    <Typography variant="h5" component="h1" fontWeight={600}>
      Расписание
    </Typography>
    <StudentWeeklyView lessons={[]} />
  </MockFrame>
);
