import type { FC } from "react";

import {
  CheckCircle as VerifiedIcon,
  WarningAmber as UnverifiedIcon,
} from "@mui/icons-material";
import { Chip, Stack, Typography } from "@mui/material";
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
      <Stack gap={2}>
        <Styled.Field>
          <Styled.FieldLabel>ФИО</Styled.FieldLabel>
          <Typography variant="body1">{info.name}</Typography>
        </Styled.Field>
        <Styled.Field>
          <Styled.FieldLabel>Email</Styled.FieldLabel>
          <Styled.EmailRow>
            <Typography variant="body1">{info.email}</Typography>
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
          </Styled.EmailRow>
        </Styled.Field>
        <Typography variant="caption" color="text.secondary">
          Для изменения данных обратитесь к преподавателю.
        </Typography>
      </Stack>
    </Styled.SectionPaper>
  );
};
