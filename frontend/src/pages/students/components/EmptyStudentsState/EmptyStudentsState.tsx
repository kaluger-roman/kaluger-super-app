import type { FC } from "react";

import { Typography } from "@mui/material";

import * as Styled from "./EmptyStudentsState.styled";

export const EmptyStudentsState: FC = () => {
  return (
    <Styled.Container>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        📚 У вас пока нет учеников
      </Typography>
      <Styled.Description color="text.secondary">
        Добавьте первого ученика, нажав на кнопку "+"
      </Styled.Description>
    </Styled.Container>
  );
};
