import type { FC } from "react";

import { Typography } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ru } from "date-fns/locale";
import { useGate, useUnit } from "effector-react";

import { LessonDialogs } from "@features";

import {
  DateRangeFilter,
  MainStatistics,
  FinancialStatistics,
  PerformanceMetrics,
  IncomeHistory,
  ReportsTabs,
  getReportsTabId,
  getReportsTabPanelId,
} from "./components";
import { reportsTabsModel, statisticsModel } from "./model";
import * as Styled from "./ReportsPage.styled";

export const ReportsPage: FC = () => {
  useGate(statisticsModel.ReportsPageGate);

  const statistics = useUnit(statisticsModel.$statistics);
  const startDate = useUnit(statisticsModel.$startDate);
  const endDate = useUnit(statisticsModel.$endDate);
  const loading = useUnit(statisticsModel.$isLoading);
  const error = useUnit(statisticsModel.$error);
  const activeTab = useUnit(reportsTabsModel.$activeTab);

  if (!statistics && error) {
    return (
      <Styled.Container>
        <Styled.ErrorPaper>
          <Typography color="error">{error}</Typography>
        </Styled.ErrorPaper>
      </Styled.Container>
    );
  }

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

        <ReportsTabs />

        <div
          role="tabpanel"
          id={getReportsTabPanelId(activeTab)}
          aria-labelledby={getReportsTabId(activeTab)}
        >
          {activeTab === "summary" && (
            <>
              <MainStatistics statistics={statistics} />
              <FinancialStatistics statistics={statistics} />
              <PerformanceMetrics statistics={statistics} />
            </>
          )}

          {activeTab === "history" && <IncomeHistory />}
        </div>

        <LessonDialogs />
      </Styled.Container>
    </LocalizationProvider>
  );
};
