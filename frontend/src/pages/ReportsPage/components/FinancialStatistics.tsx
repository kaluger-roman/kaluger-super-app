import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { AttachMoney } from "@mui/icons-material";
import { formatCurrency, calculateAveragePrice } from "../utils";
import type { Statistics } from "../../../shared/api/statistics";

type FinancialStatisticsProps = {
  statistics: Statistics;
};

export const FinancialStatistics: React.FC<FinancialStatisticsProps> = ({
  statistics,
}) => {
  return (
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
            <Typography variant="body2" color="textSecondary">
              Дохoд от всех завершенных и оплаченных уроков
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box flex="1" minWidth={300}>
        <Card sx={{ backgroundColor: "#e3f2fd" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <AttachMoney sx={{ color: "#1565c0", mr: 1 }} />
              <Typography variant="h6">Предоплата</Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "#1565c0", fontWeight: "bold", mb: 1 }}
            >
              {formatCurrency(statistics.prepaidIncome || 0)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Дохoд от всех предоплаченных уроков (остаток)
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Average lesson */}
      <Box flex="1" minWidth={220}>
        <Card sx={{ backgroundColor: "#fffde7" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Средний урок
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
              {formatCurrency(
                calculateAveragePrice(
                  statistics.earnings,
                  statistics.completedLessons
                )
              )}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Средняя цена по завершенным урокам
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Lost earnings */}
      <Box flex="1" minWidth={220}>
        <Card sx={{ backgroundColor: "#ffebee" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Потери от отмен
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", mb: 1 }}
              color="error"
            >
              -{formatCurrency(statistics.lostEarnings)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Сумма потерянного дохода из-за отмен
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Potential income */}
      <Box flex="1" minWidth={220}>
        <Card sx={{ backgroundColor: "#f1f8e9" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Потенциальный доход за период
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
              {formatCurrency(
                statistics.earnings +
                  (statistics.unpaidDebtSum || 0) +
                  (statistics.upcomingIncome || 0)
              )}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Уже заработанное + долг + все предстоящие уроки без отмен
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Unpaid debt */}
      <Box flex="1" minWidth={300}>
        <Card sx={{ backgroundColor: "#fff8e1" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Задолженность
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">
                  Итого (проведено, не оплачено):
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="error">
                  {formatCurrency(statistics.unpaidDebtSum || 0)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Количество уроков:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error">
                  {statistics.unpaidDebtCount || 0}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">
                  Не оплачено более 24 часов:
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="error">
                  {formatCurrency(statistics.unpaidDebtOver24hSum || 0)} (
                  {statistics.unpaidDebtOver24hCount || 0} уроков)
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box flex="0" minWidth={180}>
        <Card sx={{ backgroundColor: "#f3e5f5" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Пробные уроки
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
              {statistics.trialLessonsCount || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Бесплатных уроков в периоде
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
