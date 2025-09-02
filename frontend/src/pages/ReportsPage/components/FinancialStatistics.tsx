import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { AttachMoney } from "@mui/icons-material";
import {
  formatCurrency,
  calculateEarningsChange,
  calculateAveragePrice,
} from "../utils";
import type { Statistics } from "../../../shared/api/statistics";

type FinancialStatisticsProps = {
  statistics: Statistics;
};

export const FinancialStatistics: React.FC<FinancialStatisticsProps> = ({
  statistics,
}) => {
  const { change: earningsChange, changePercent: earningsChangePercent } =
    calculateEarningsChange(statistics.earnings, statistics.lastMonthEarnings);

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
                  {formatCurrency(
                    calculateAveragePrice(
                      statistics.earnings,
                      statistics.completedLessons
                    )
                  )}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Потери от отмен:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error">
                  -{formatCurrency(statistics.lostEarnings)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Потенциальный доход:</Typography>
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
  );
};
