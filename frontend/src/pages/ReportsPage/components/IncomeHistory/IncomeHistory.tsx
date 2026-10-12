import type { FC } from "react";

import { Alert, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import {
  IncomeHistoryDay,
  IncomeHistoryEmpty,
  IncomeHistoryLoadMore,
  IncomeHistorySummary,
} from "./components";
import { formatAppliedPeriod } from "./IncomeHistory.helpers";
import * as Styled from "./IncomeHistory.styled";
import { incomeHistoryModel, statisticsModel } from "../../model";

export const IncomeHistory: FC = () => {
  const history = useUnit(incomeHistoryModel.$incomeHistory);
  const error = useUnit(incomeHistoryModel.$incomeHistoryError);
  const isNextPageLoading = useUnit(incomeHistoryModel.$isNextPageLoading);
  const nextPageError = useUnit(incomeHistoryModel.$nextPageError);
  const appliedRange = useUnit(statisticsModel.$appliedRange);
  const actions = useUnit({ loadMore: incomeHistoryModel.incomeHistoryNextPageRequested });

  const isEmpty = history !== null && history.summary.count === 0;

  return (
    <Styled.Section role="region" aria-label="История поступлений">
      <Styled.Header>
        <Typography variant="body2" color="textSecondary">
          Оплаты за {formatAppliedPeriod(appliedRange)} по дате платежа, от новых к старым. Нажмите
          на оплату, чтобы открыть урок
        </Typography>
      </Styled.Header>

      {error && <Alert severity="error">{error}</Alert>}

      {!error && isEmpty && <IncomeHistoryEmpty />}

      {!error && history && !isEmpty && (
        <>
          <IncomeHistorySummary summary={history.summary} />
          <Styled.DayList>
            {history.days.map((day) => (
              <IncomeHistoryDay key={day.date} day={day} />
            ))}
          </Styled.DayList>
          <IncomeHistoryLoadMore
            remainingCount={history.page.remainingCount}
            isLoading={isNextPageLoading}
            error={nextPageError}
            onLoadMore={() => actions.loadMore()}
          />
        </>
      )}
    </Styled.Section>
  );
};
