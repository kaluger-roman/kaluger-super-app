import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import { formatDate } from "./StudentViewDialog.helpers";
import * as Styled from "./StudentViewDialog.styled";

type StudentMetaProps = {
  createdAt: string;
  updatedAt: string;
};

export const StudentMeta: FC<StudentMetaProps> = ({ createdAt, updatedAt }) => (
  <Box>
    <Styled.SectionTitle variant="subtitle2">ℹ️ Информация</Styled.SectionTitle>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      Добавлен: {formatDate(createdAt)}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Обновлен: {formatDate(updatedAt)}
    </Typography>
  </Box>
);
