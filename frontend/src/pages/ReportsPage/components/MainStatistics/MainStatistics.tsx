import type { FC } from "react";

import { School, Cancel, Assignment, TrendingUp } from "@mui/icons-material";
import { Box } from "@mui/material";

import type { Statistics } from "@shared";

import { StatCard } from "../StatCard";

type MainStatisticsProps = {
  statistics: Statistics;
};

export const MainStatistics: FC<MainStatisticsProps> = ({ statistics }) => {
  return (
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
  );
};
