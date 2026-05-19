import type { FC } from "react";

import {
  CheckCircle as VerifiedIcon,
  WarningAmber as UnverifiedIcon,
} from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import * as Styled from "./StudentInfoSection.styled";
import { studentSettingsModel } from "../../model";

export const StudentInfoSection: FC = () => {
  const info = useUnit(studentSettingsModel.$studentInfo);

  if (!info) return null;

  return (
    <Styled.SectionPaper variant="outlined">
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Ваши данные
      </Typography>
      <Stack gap={1}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            ФИО
          </Typography>
          <Typography variant="body1">{info.name}</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{info.email}</Typography>
          </Box>
          {info.isEmailVerified ? (
            <Chip
              icon={<VerifiedIcon />}
              color="success"
              size="small"
              label="Подтверждён"
            />
          ) : (
            <Chip
              icon={<UnverifiedIcon />}
              color="warning"
              size="small"
              label="Не подтверждён"
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Для изменения данных обратитесь к преподавателю.
        </Typography>
      </Stack>
    </Styled.SectionPaper>
  );
};
