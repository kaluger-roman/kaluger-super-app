import type { FC } from "react";

import { Box } from "@mui/material";

import { EmptyState, InfoMessage, LessonContextMenu, LessonsYear, WeeklyView } from "./components";
import { useLessonsGrouping, useLessonMenu } from "./hooks";
import { sortYears } from "./LessonsList.helpers";
import type { Lesson } from "../../types";

type LessonsListProps = {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onCancel?: (lesson: Lesson) => void;
  onRestore?: (lesson: Lesson) => void;
  onReschedule?: (lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  onCardClick: (lesson: Lesson) => void;
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
  viewMode?: "paged" | "weekly" | "schedule";
};

export const LessonsList: FC<LessonsListProps> = ({
  lessons,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
  onPaymentChange,
  onHomeworkSentChange,
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

  const {
    anchorEl,
    selectedLesson,
    handleMenuClick,
    handleMenuClose,
    handleEdit,
    handleDelete,
    handleCancel,
    handleRestore,
    handleReschedule,
  } = useLessonMenu({
    onEdit,
    onDelete,
    onCancel,
    onRestore,
    onReschedule,
  });

  if (filteredLessons.length === 0) {
    return <EmptyState type={type} />;
  }
  const commonProps = {
    onEdit,
    onDelete,
    onCancel,
    onRestore,
    onReschedule,
    onPaymentChange,
    onHomeworkSentChange,
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

      <LessonContextMenu
        anchorEl={anchorEl}
        selectedLesson={selectedLesson}
        onClose={handleMenuClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancel={handleCancel}
        onRestore={handleRestore}
        onReschedule={handleReschedule}
      />
    </Box>
  );
};
