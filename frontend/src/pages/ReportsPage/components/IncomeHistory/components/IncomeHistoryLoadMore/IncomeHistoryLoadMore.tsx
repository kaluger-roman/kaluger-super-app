import type { FC } from "react";

import { Alert, Button, CircularProgress } from "@mui/material";

import * as Styled from "./IncomeHistoryLoadMore.styled";

type IncomeHistoryLoadMoreProps = {
  remainingCount: number;
  isLoading: boolean;
  error: string | null;
  onLoadMore: () => void;
};

export const IncomeHistoryLoadMore: FC<IncomeHistoryLoadMoreProps> = ({
  remainingCount,
  isLoading,
  error,
  onLoadMore,
}) => {
  if (remainingCount <= 0) return null;

  return (
    <Styled.Container>
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onLoadMore}>
              Повторить
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {!error && (
        <Styled.LoadMoreButton
          variant="outlined"
          onClick={isLoading ? undefined : onLoadMore}
          aria-disabled={isLoading}
          aria-busy={isLoading}
          $isLoading={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isLoading ? "Загружаем оплаты…" : `Показать ещё (осталось ${remainingCount})`}
        </Styled.LoadMoreButton>
      )}
    </Styled.Container>
  );
};
