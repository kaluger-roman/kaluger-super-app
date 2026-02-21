import type { FC } from "react";

import { Typography } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";
import { useGate, useUnit } from "effector-react";

import { userModel } from "@entities";

import {
  DateRangeFilter,
  MainStatistics,
  FinancialStatistics,
  PerformanceMetrics,
} from "./components";
import { statisticsModel } from "./model";
import * as Styled from "./ReportsPage.styled";

export const ReportsPage: FC = () => {
  useGate(statisticsModel.ReportsPageGate);

  const user = useUnit(userModel.$user);
  const statistics = useUnit(statisticsModel.$statistics);
  const startDate = useUnit(statisticsModel.$startDate);
  const endDate = useUnit(statisticsModel.$endDate);
  const loading = useUnit(statisticsModel.$isLoading);
  const error = useUnit(statisticsModel.$error);

  if (!statistics) {
    return null;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Styled.Container>
        <Typography variant="h4" gutterBottom>
          📊 Отчеты и статистика
        </Typography>

        {error && (
          <Styled.ErrorPaper>
            <Typography color="error">{error}</Typography>
          </Styled.ErrorPaper>
        )}

        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          loading={loading}
          onStartDateChange={statisticsModel.startDateChanged}
          onEndDateChange={statisticsModel.endDateChanged}
          onUpdate={statisticsModel.statisticsLoadRequested}
        />

        <MainStatistics statistics={statistics} />

        <FinancialStatistics statistics={statistics} taxRate={user?.taxRate ?? 6} />

        <PerformanceMetrics statistics={statistics} />
      </Styled.Container>
    </LocalizationProvider>
  );
};
