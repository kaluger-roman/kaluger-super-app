import { useState, useMemo } from "react";

import type { Lesson } from "@shared";

import { filterLessonsByType, groupLessonsByDate } from "../LessonsList.helpers";
import type { LessonListType } from "../LessonsList.types";

type UseLessonsGroupingProps = {
  lessons: Lesson[];
  type: LessonListType;
};

export const useLessonsGrouping = ({ lessons, type }: UseLessonsGroupingProps) => {
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({});
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const filteredLessons = useMemo(() => {
    return filterLessonsByType(lessons, type);
  }, [lessons, type]);

  const groupedLessons = useMemo(() => {
    return groupLessonsByDate(filteredLessons, type);
  }, [filteredLessons, type]);

  const toggleYear = (year: string) => {
    setCollapsedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const toggleMonth = (year: string, month: string) => {
    const key = `${year}_${month}`;
    setCollapsedMonths((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return {
    filteredLessons,
    groupedLessons,
    collapsedYears,
    collapsedMonths,
    toggleYear,
    toggleMonth,
  };
};
