import type { FC } from "react";

import { Typography } from "@mui/material";

import * as Styled from "./EmptyStudentsState.styled";

type EmptyStudentsStateProps = {
  isArchiveTab?: boolean;
};

export const EmptyStudentsState: FC<EmptyStudentsStateProps> = ({ isArchiveTab = false }) => {
  return (
    <Styled.Container>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {isArchiveTab ? "📦 Архив пуст" : "📚 У вас пока нет учеников"}
      </Typography>
      <Styled.Description color="text.secondary">
        {isArchiveTab
          ? "Здесь будут отображаться архивированные ученики"
          : 'Добавьте первого ученика, нажав на кнопку "+"'}
      </Styled.Description>
    </Styled.Container>
  );
};
