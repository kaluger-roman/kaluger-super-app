import type { FC } from "react";

import { Typography } from "@mui/material";
import { useGate } from "effector-react";

import { newsModel } from "@entities";
import { NewsList } from "@features/news";

import * as Styled from "./NewsPage.styled";

export const NewsPage: FC = () => {
  useGate(newsModel.NewsPageGate);

  return (
    <Styled.StyledContainer maxWidth="md">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h3" component="h1" gutterBottom>
          📰 Новости
        </Styled.StyledTitle>
        <Typography variant="h6" color="text.secondary">
          Обновления приложения
        </Typography>
      </Styled.HeaderBox>

      <NewsList />
    </Styled.StyledContainer>
  );
};
