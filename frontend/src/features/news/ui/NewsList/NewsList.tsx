import type { FC } from "react";

import { Button } from "@mui/material";
import { useUnit } from "effector-react";

import { newsModel } from "@entities";

import { NewsCard } from "../NewsCard";
import * as Styled from "./NewsList.styled";

export const NewsList: FC = () => {
  const news = useUnit(newsModel.$news);
  const pagination = useUnit(newsModel.$pagination);
  const isLoading = useUnit(newsModel.$isNewsLoading);

  const hasMore = pagination !== null && pagination.page < pagination.totalPages;

  if (news.length === 0 && !isLoading) {
    return <Styled.EmptyText variant="h6">Пока нет новостей</Styled.EmptyText>;
  }

  return (
    <Styled.Container>
      {news.map((item) => (
        <NewsCard key={item.id} news={item} />
      ))}
      {hasMore && (
        <Styled.LoadMoreBox>
          <Button variant="outlined" onClick={() => newsModel.loadMoreNews()} disabled={isLoading}>
            {isLoading ? "Загрузка..." : "Загрузить ещё"}
          </Button>
        </Styled.LoadMoreBox>
      )}
    </Styled.Container>
  );
};
