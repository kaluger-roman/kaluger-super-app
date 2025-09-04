import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { calculateCompletionRate } from "../utils";
import type { Statistics } from "../../../shared/api/statistics";

type PerformanceMetricsProps = {
  statistics: Statistics;
};

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  statistics,
}) => {
  const completionRate = calculateCompletionRate(
    statistics.completedLessons,
    statistics.totalLessons
  );
  const cancellationRate = calculateCompletionRate(
    statistics.cancelledLessons,
    statistics.totalLessons
  );

  return (
    <Box display="flex" flexWrap="wrap" gap={3}>
      <Box flex="1" minWidth={300}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📈 Показатели эффективности (период)
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Процент завершенных уроков
                </Typography>
                <Typography variant="h6" color="primary">
                  {completionRate}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Процент отмен
                </Typography>
                <Typography variant="h6" color="error">
                  {cancellationRate}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
