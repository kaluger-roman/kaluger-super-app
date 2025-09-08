import React from "react";
import { Box, Pagination } from "@mui/material";
import { LessonsList } from "../../../shared";
import type { Lesson } from "../../../shared";

type PageInfo = { totalPages: number; page: number };

type LessonsContentProps = {
  currentTab: number;
  upcomingLessons: Lesson[];
  completedLessons: Lesson[];
  cancelledLessons: Lesson[];
  upcomingPagination: PageInfo;
  completedPagination: PageInfo;
  cancelledPagination: PageInfo;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onCancel: (lesson: Lesson) => void;
  onRestore: (lesson: Lesson) => void;
  onReschedule: (lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  onCardClick: (lesson: Lesson) => void;
  onUpcomingPageChange: (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => void;
  onCompletedPageChange: (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => void;
  onCancelledPageChange: (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => void;
};

const TAB_CONFIG: {
  key: number;
  listProp: keyof Omit<
    LessonsContentProps,
    | "currentTab"
    | "onEdit"
    | "onDelete"
    | "onCancel"
    | "onRestore"
    | "onReschedule"
    | "onPaymentChange"
    | "onCardClick"
    | "onUpcomingPageChange"
    | "onCompletedPageChange"
    | "onCancelledPageChange"
  >;
  paginationProp: keyof Omit<
    LessonsContentProps,
    | "currentTab"
    | "upcomingLessons"
    | "completedLessons"
    | "cancelledLessons"
    | "rescheduledLessons"
    | "onEdit"
    | "onDelete"
    | "onCancel"
    | "onRestore"
    | "onReschedule"
    | "onPaymentChange"
    | "onCardClick"
    | "onUpcomingPageChange"
    | "onCompletedPageChange"
    | "onCancelledPageChange"
  >;
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
}[] = [
  {
    key: 0,
    listProp: "upcomingLessons",
    paginationProp: "upcomingPagination",
    type: "scheduled",
  },
  {
    key: 1,
    listProp: "completedLessons",
    paginationProp: "completedPagination",
    type: "completed",
  },
  {
    key: 2,
    listProp: "cancelledLessons",
    paginationProp: "cancelledPagination",
    type: "cancelled",
  },
];

export const LessonsContent: React.FC<LessonsContentProps> = (props) => {
  const {
    currentTab,
    onEdit,
    onDelete,
    onCancel,
    onRestore,
    onReschedule,
    onPaymentChange,
    onHomeworkSentChange,
    onCardClick,
    onUpcomingPageChange,
    onCompletedPageChange,
    onCancelledPageChange,
  } = props;

  const cfg = TAB_CONFIG.find((t) => t.key === currentTab) ?? TAB_CONFIG[0];

  const lessons = props[cfg.listProp] as Lesson[];
  const pagination = props[cfg.paginationProp] as PageInfo;

  const handlePageChange = (e: React.ChangeEvent<unknown>, page: number) => {
    switch (cfg.key) {
      case 0:
        return onUpcomingPageChange(e, page);
      case 1:
        return onCompletedPageChange(e, page);
      case 2:
        return onCancelledPageChange(e, page);
      default:
        return;
    }
  };

  return (
    <>
      <LessonsList
        lessons={lessons}
        onEdit={onEdit}
        onDelete={onDelete}
        onCancel={onCancel}
        onRestore={onRestore}
        onReschedule={onReschedule}
        onPaymentChange={onPaymentChange}
        onHomeworkSentChange={onHomeworkSentChange}
        onCardClick={onCardClick}
        type={cfg.type}
      />

      {pagination?.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </>
  );
};
