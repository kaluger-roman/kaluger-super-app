import React from "react";
import { Box, Pagination } from "@mui/material";
import { LessonsList } from "../../../shared";
import type { Lesson } from "../../../shared";

type LessonsContentProps = {
  currentTab: number;
  upcomingLessons: Lesson[];
  completedLessons: Lesson[];
  upcomingPagination: {
    totalPages: number;
    page: number;
  };
  completedPagination: {
    totalPages: number;
    page: number;
  };
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onCancel: (lesson: Lesson) => void;
  onRestore: (lesson: Lesson) => void;
  onReschedule: (lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onCardClick: (lesson: Lesson) => void;
  onUpcomingPageChange: (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => void;
  onCompletedPageChange: (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => void;
};

export const LessonsContent: React.FC<LessonsContentProps> = ({
  currentTab,
  upcomingLessons,
  completedLessons,
  upcomingPagination,
  completedPagination,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
  onPaymentChange,
  onCardClick,
  onUpcomingPageChange,
  onCompletedPageChange,
}) => {
  if (currentTab === 0) {
    return (
      <>
        <LessonsList
          lessons={upcomingLessons}
          onEdit={onEdit}
          onDelete={onDelete}
          onCancel={onCancel}
          onRestore={onRestore}
          onReschedule={onReschedule}
          onPaymentChange={onPaymentChange}
          onCardClick={onCardClick}
          type="scheduled"
        />
        {upcomingPagination.totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={upcomingPagination.totalPages}
              page={upcomingPagination.page}
              onChange={onUpcomingPageChange}
              color="primary"
              size="large"
            />
          </Box>
        )}
      </>
    );
  }

  return (
    <>
      <LessonsList
        lessons={completedLessons}
        onEdit={onEdit}
        onDelete={onDelete}
        onPaymentChange={onPaymentChange}
        onCancel={onCancel}
        onRestore={onRestore}
        onReschedule={onReschedule}
        onCardClick={onCardClick}
        type="completed"
      />
      {completedPagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={completedPagination.totalPages}
            page={completedPagination.page}
            onChange={onCompletedPageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </>
  );
};
