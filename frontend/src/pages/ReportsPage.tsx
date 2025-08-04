import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  School,
  Cancel,
  Assignment,
  TrendingUp,
  AttachMoney,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { statisticsApi, Statistics } from "../shared/api/statistics";

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
}) => (
  <Card sx={{ height: "100%", backgroundColor: "#f8f9fa" }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box
          sx={{
            color: color,
            mr: 1,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" color="textSecondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ color: color, fontWeight: "bold" }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const ReportsPage: React.FC = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: { startDate?: string; endDate?: string } = {};

      if (dateRange.startDate) {
        params.startDate = dateRange.startDate.toISOString().split("T")[0];
      }

      if (dateRange.endDate) {
        params.endDate = dateRange.endDate.toISOString().split("T")[0];
      }

      const response = await statisticsApi.getStatistics(params);
      setStatistics(response.data);
    } catch (err) {
      console.error("Ошибка загрузки статистики:", err);
      setError("Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const handleDateRangeChange = () => {
    loadStatistics();
  };

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

  const earningsChange = statistics.earnings - statistics.lastMonthEarnings;
  const earningsChangePercent =
    statistics.lastMonthEarnings > 0
      ? ((earningsChange / statistics.lastMonthEarnings) * 100).toFixed(1)
      : "0";

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

        {/* Фильтры */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📅 Период отчета
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
              <Box flex="1" minWidth={200}>
                <DatePicker
                  label="Дата начала"
                  value={dateRange.startDate}
                  onChange={(newValue) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: newValue || new Date(),
                    }))
                  }
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </Box>
              <Box flex="1" minWidth={200}>
                <DatePicker
                  label="Дата окончания"
                  value={dateRange.endDate}
                  onChange={(newValue) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: newValue || new Date(),
                    }))
                  }
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </Box>
              <Box>
                <Button
                  variant="contained"
                  onClick={handleDateRangeChange}
                  disabled={loading}
                  sx={{ height: 56, minWidth: 120 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Обновить"}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Основная статистика */}
        <Box display="flex" flexWrap="wrap" gap={3} mb={3}>
          <Box flex="1" minWidth={250}>
            <StatCard
              title="Проведено уроков"
              value={statistics.completedLessons}
              icon={<School />}
              color="#2E7D47"
              subtitle="Завершенные уроки"
            />
          </Box>

          <Box flex="1" minWidth={250}>
            <StatCard
              title="Отменено уроков"
              value={statistics.cancelledLessons}
              icon={<Cancel />}
              color="#d32f2f"
              subtitle="Отмененные уроки"
            />
          </Box>

          <Box flex="1" minWidth={250}>
            <StatCard
              title="Запланировано"
              value={statistics.upcomingLessons}
              icon={<Assignment />}
              color="#1976d2"
              subtitle="Предстоящие уроки"
            />
          </Box>

          <Box flex="1" minWidth={250}>
            <StatCard
              title="Всего уроков"
              value={statistics.totalLessons}
              icon={<TrendingUp />}
              color="#9c27b0"
              subtitle="За выбранный период"
            />
          </Box>
        </Box>

        {/* Финансовая статистика */}
        <Box display="flex" flexWrap="wrap" gap={3} mb={3}>
          <Box flex="1" minWidth={300}>
            <Card sx={{ backgroundColor: "#e8f5e8" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AttachMoney sx={{ color: "#2E7D47", mr: 1 }} />
                  <Typography variant="h6">Заработок</Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{ color: "#2E7D47", fontWeight: "bold", mb: 1 }}
                >
                  {formatCurrency(statistics.earnings)}
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" color="textSecondary">
                    Изменение:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: earningsChange >= 0 ? "#2E7D47" : "#d32f2f",
                      fontWeight: "bold",
                      ml: 1,
                    }}
                  >
                    {earningsChange >= 0 ? "+" : ""}
                    {formatCurrency(earningsChange)} ({earningsChangePercent}%)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box flex="1" minWidth={300}>
            <Card sx={{ backgroundColor: "#fff3e0" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💰 Статистика по доходам
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Средний урок:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {statistics.completedLessons > 0
                        ? formatCurrency(
                            statistics.earnings / statistics.completedLessons
                          )
                        : "0 ₽"}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Потери от отмен:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error">
                      -{formatCurrency(statistics.lostEarnings)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">
                      Потенциальный доход:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(
                        statistics.earnings + statistics.lostEarnings
                      )}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Дополнительная аналитика */}
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box flex="1" minWidth={300}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 Показатели эффективности
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Процент завершенных уроков
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {statistics.totalLessons > 0
                        ? Math.round(
                            (statistics.completedLessons /
                              statistics.totalLessons) *
                              100
                          )
                        : 0}
                      %
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Процент отмен
                    </Typography>
                    <Typography variant="h6" color="error">
                      {statistics.totalLessons > 0
                        ? Math.round(
                            (statistics.cancelledLessons /
                              statistics.totalLessons) *
                              100
                          )
                        : 0}
                      %
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};
