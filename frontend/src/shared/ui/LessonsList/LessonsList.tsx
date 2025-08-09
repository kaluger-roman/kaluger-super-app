import React from "react";
import { Box } from "@mui/material";
import { Lesson } from "../../types";
import {
  EmptyState,
  InfoMessage,
  LessonContextMenu,
  LessonsYear,
} from "./components";
import { useLessonsGrouping, useLessonMenu } from "./hooks";
import { sortYears } from "./utils";

type LessonsListProps = {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onCancel?: (lesson: Lesson) => void;
  onRestore?: (lesson: Lesson) => void;
  onReschedule?: (lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onCardClick: (lesson: Lesson) => void;
  type: "scheduled" | "completed";
};

export const LessonsList: React.FC<LessonsListProps> = ({
  lessons,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
  onPaymentChange,
  onCardClick,
  type,
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

  const sortedYears = sortYears(Object.keys(groupedLessons), type);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {sortedYears.map((year) => {
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
            onCardClick={onCardClick}
            onMenuClick={handleMenuClick}
            onPaymentChange={onPaymentChange}
            type={type}
          />
        );
      })}

      {type === "scheduled" && <InfoMessage />}

      <LessonContextMenu
        anchorEl={anchorEl}
        selectedLesson={selectedLesson}
        onClose={handleMenuClose}
        onEdit={type === "scheduled" ? handleEdit : undefined}
        onDelete={handleDelete}
        onCancel={type === "scheduled" && onCancel ? handleCancel : undefined}
        onRestore={
          type === "scheduled" && onRestore ? handleRestore : undefined
        }
        onReschedule={
          type === "scheduled" && onReschedule ? handleReschedule : undefined
        }
      />
    </Box>
  );
};
