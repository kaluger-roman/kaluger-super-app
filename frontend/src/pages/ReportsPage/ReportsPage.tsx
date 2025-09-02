import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import {
  useReportsPage,
  DateRangeFilter,
  MainStatistics,
  FinancialStatistics,
  PerformanceMetrics,
} from "./index";

export const ReportsPage: React.FC = () => {
  const {
    statistics,
    loading,
    error,
    dateRange,
    loadStatistics,
    updateDateRange,
  } = useReportsPage();

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  if (!statistics) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          📊 Отчеты
        </Typography>
        <Typography>Загрузка данных...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          📊 Отчеты и статистика
        </Typography>

        {error && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: "#ffebee" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          loading={loading}
          onStartDateChange={(value) => updateDateRange("startDate", value)}
          onEndDateChange={(value) => updateDateRange("endDate", value)}
          onUpdate={loadStatistics}
        />

        <MainStatistics statistics={statistics} />

        <FinancialStatistics statistics={statistics} />

        <PerformanceMetrics statistics={statistics} />
      </Box>
    </LocalizationProvider>
  );
};
