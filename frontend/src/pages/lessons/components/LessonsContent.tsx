import React from "react";
import { Box, Pagination } from "@mui/material";
import { LessonsList } from "../../../shared";
import type { Lesson } from "../../../shared";

type LessonsContentProps = {
  currentTab: number;
  upcomingLessons: Lesson[];
  completedLessons: Lesson[];
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
  onCompletedPageChange: (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => void;
};

export const LessonsContent: React.FC<LessonsContentProps> = ({
  currentTab,
  upcomingLessons,
  completedLessons,
  completedPagination,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
  onPaymentChange,
  onCardClick,
  onCompletedPageChange,
}) => {
  if (currentTab === 0) {
    return (
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
    );
  }

  return (
    <>
      <LessonsList
        lessons={completedLessons}
        onEdit={onEdit}
        onDelete={onDelete}
        onPaymentChange={onPaymentChange}
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
