import { useState } from "react";
import { GroupedLessons, UseCompletedLessonsAccordionReturn } from "./types";

export const useCompletedLessonsAccordion = (
  groupedLessons: GroupedLessons
): UseCompletedLessonsAccordionReturn => {
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const handleYearToggle = (year: string) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const handleMonthToggle = (monthKey: string) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const handleDayToggle = (dayKey: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  return {
    expandedYears,
    expandedMonths,
    expandedDays,
    handleYearToggle,
    handleMonthToggle,
    handleDayToggle,
  };
};
