import type { FC, ReactNode } from "react";

import type { NewsItem } from "@shared";
import { formatDate } from "@shared";

import * as Styled from "./NewsCard.styled";

type NewsCardProps = {
  news: NewsItem;
};

const renderContent = (text: string): ReactNode[] => {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) return null;

    const withBold = trimmed.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>",
    );

    if (trimmed.startsWith("- ")) {
      return (
        <Styled.ListItem
          key={i}
          dangerouslySetInnerHTML={{ __html: withBold.slice(2) }}
        />
      );
    }

    return (
      <Styled.SectionTitle
        key={i}
        dangerouslySetInnerHTML={{ __html: withBold }}
      />
    );
  });
};

export const NewsCard: FC<NewsCardProps> = ({ news }) => {
  return (
    <Styled.StyledCard variant="outlined">
      <Styled.StyledCardContent>
        <Styled.Title variant="h6" component="h2">
          {news.title}
        </Styled.Title>
        <Styled.DateText variant="body2">
          {formatDate(new Date(news.publishedAt))}
        </Styled.DateText>
        <Styled.ContentBox>{renderContent(news.content)}</Styled.ContentBox>
      </Styled.StyledCardContent>
    </Styled.StyledCard>
  );
};
