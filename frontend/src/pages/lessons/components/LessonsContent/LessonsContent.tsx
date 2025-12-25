import type { ChangeEvent, FC } from "react";

import { Box, Pagination } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonModel } from "@entities";
import { lessonsModel } from "@features";
import { LessonsList } from "@shared";

import { ScheduleView } from "../ScheduleView";
import { WeekPagination } from "../WeekPagination";

type LessonsContentProps = {
  currentTab: number;
};

const TAB_CONFIG = [
  {
    key: 0,
    listStore: lessonModel.$upcomingLessons,
    paginationStore: lessonModel.$upcomingPagination,
    loadAction: lessonModel.loadUpcomingLessons,
    type: "scheduled" as const,
  },
  {
    key: 1,
    listStore: lessonModel.$completedLessons,
    paginationStore: lessonModel.$completedPagination,
    loadAction: lessonModel.loadCompletedLessons,
    type: "completed" as const,
  },
  {
    key: 2,
    listStore: lessonModel.$cancelledLessons,
    paginationStore: lessonModel.$cancelledPagination,
    loadAction: lessonModel.loadCancelledLessons,
    type: "cancelled" as const,
  },
];

export const LessonsContent: FC<LessonsContentProps> = ({ currentTab }) => {
  const cfg = TAB_CONFIG.find((t) => t.key === currentTab) ?? TAB_CONFIG[0];

  const viewMode = useUnit(lessonsModel.$lessonsViewMode);
  const scheduleLessons = useUnit(lessonModel.$scheduleLessons);
  const onlyUnpaid = useUnit(lessonsModel.$onlyUnpaid);
  const onlyWithoutHomework = useUnit(lessonsModel.$onlyWithoutHomework);

  const lessonsSource = useUnit(viewMode === "weekly" ? lessonModel.$weeklyLessons : cfg.listStore);
  const pagination = useUnit(cfg.paginationStore);

  const handlePageChange = (_e: ChangeEvent<unknown>, page: number) => {
    cfg.loadAction({
      page,
      limit: 10,
      onlyUnpaid,
      onlyWithoutHomework,
    });
  };

  const handleLoadMoreDays = (startDate: Date, endDate: Date) => {
    lessonModel.loadScheduleLessons({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      noPagination: "true",
    });
  };

  if (viewMode === "schedule") {
    return (
      <ScheduleView
        lessons={scheduleLessons}
        onLessonClick={lessonsModel.viewDialogOpened}
        onLoadMoreDays={handleLoadMoreDays}
      />
    );
  }

  return (
    <>
      <LessonsList
        lessons={lessonsSource}
        viewMode={viewMode}
        onEdit={lessonsModel.dialogOpened}
        onDelete={lessonsModel.deleteDialogOpened}
        onCancel={lessonsModel.lessonCancelRequested}
        onRestore={lessonsModel.lessonRestoreRequested}
        onReschedule={lessonsModel.rescheduleDialogOpened}
        onPaymentChange={(lessonId, isPaid) =>
          lessonsModel.lessonPaymentChanged({ lessonId, isPaid })
        }
        onHomeworkSentChange={(lessonId, isSent) =>
          lessonsModel.lessonHomeworkSentChanged({ lessonId, isSent })
        }
        onCardClick={lessonsModel.viewDialogOpened}
        type={cfg.type}
      />

      {viewMode === "paged" && pagination?.totalPages > 1 && (
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

      {viewMode === "weekly" && <WeekPagination />}
    </>
  );
};
