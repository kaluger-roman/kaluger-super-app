import type { FC } from "react";

import {
  LinkOff as LinkOffIcon,
  School as SchoolIcon,
} from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./TutorInfoSection.styled";
import { studentSettingsModel } from "../../model";

export const TutorInfoSection: FC = () => {
  const tutor = useUnit(studentSettingsModel.$tutorInfo);

  return (
    <Styled.SectionPaper variant="outlined">
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Преподаватель
      </Typography>
      <Stack gap={1}>
        {tutor ? (
          <Box display="flex" alignItems="center" gap={1}>
            <SchoolIcon color="primary" fontSize="small" />
            <Typography variant="body1">{tutor.name}</Typography>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1}>
            <LinkOffIcon color="warning" fontSize="small" />
            <Typography variant="body1" color="text.secondary">
              Связь с преподавателем прекращена
            </Typography>
          </Box>
        )}
      </Stack>
    </Styled.SectionPaper>
  );
};
