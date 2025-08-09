import { useState, useMemo } from "react";
import { Lesson } from "../../../types";
import { filterLessonsByType, groupLessonsByDate } from "../utils/lessonUtils";

type UseLessonsGroupingProps = {
  lessons: Lesson[];
  type: "scheduled" | "completed";
};

export const useLessonsGrouping = ({
  lessons,
  type,
}: UseLessonsGroupingProps) => {
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>(
    {}
  );
  const [collapsedMonths, setCollapsedMonths] = useState<
    Record<string, boolean>
  >({});

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
