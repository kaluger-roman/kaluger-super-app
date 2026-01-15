import type { FC } from "react";

import { Box } from "@mui/material";

import type { Lesson } from "@shared";

import { EmptyState, InfoMessage, LessonContextMenu, LessonsYear, WeeklyView } from "./components";
import { useLessonsGrouping, useLessonMenu } from "./hooks";
import { sortYears } from "./LessonsList.helpers";

type LessonsListProps = {
  lessons: Lesson[];
  onCardClick: (lesson: Lesson) => void;
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
  viewMode?: "paged" | "weekly" | "schedule";
};

export const LessonsList: FC<LessonsListProps> = ({
  lessons,
  onCardClick,
  type,
  viewMode = "paged",
}) => {
  const {
    filteredLessons,
    groupedLessons,
    collapsedYears,
    collapsedMonths,
    toggleYear,
    toggleMonth,
  } = useLessonsGrouping({ lessons, type });

  const { anchorEl, selectedLesson, handleMenuClick, handleMenuClose } = useLessonMenu();

  if (filteredLessons.length === 0) {
    return <EmptyState type={type} />;
  }

  const commonProps = {
    onCardClick,
    type,
  } as const;

  const body =
    viewMode === "weekly" ? (
      <WeeklyView lessons={filteredLessons} onMenuClick={handleMenuClick} {...commonProps} />
    ) : (
      sortYears(Object.keys(groupedLessons), type).map((year) => {
        const isYearCollapsed = collapsedYears[year] ?? false;
        return (
          <LessonsYear
            key={year}
            year={year}
            yearData={groupedLessons[year]}
            isCollapsed={isYearCollapsed}
            collapsedMonths={collapsedMonths}
            onToggleYear={() => toggleYear(year)}
            onToggleMonth={(month) => toggleMonth(year, month)}
            onMenuClick={handleMenuClick}
            {...commonProps}
          />
        );
      })
    );

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {body}

      {type === "scheduled" && <InfoMessage />}

      {selectedLesson && (
        <LessonContextMenu
          anchorEl={anchorEl}
          selectedLesson={selectedLesson}
          onClose={handleMenuClose}
        />
      )}
    </Box>
  );
};
