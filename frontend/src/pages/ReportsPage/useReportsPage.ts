import { useState, useCallback } from "react";
import { Statistics, statisticsApi } from "../../shared/api/statistics";

export const useReportsPage = () => {
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

  const updateDateRange = (
    field: "startDate" | "endDate",
    value: Date | null
  ) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value || new Date(),
    }));
  };

  return {
    statistics,
    loading,
    error,
    dateRange,
    loadStatistics,
    updateDateRange,
  };
};
