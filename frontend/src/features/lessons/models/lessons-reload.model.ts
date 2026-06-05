import { sample } from "effector";

import { lessonModel } from "@entities";

import { buildLessonFilterParams, buildPagedLessonParams } from "./lessons-filters.helpers";
import * as filtersModel from "./lessons-filters.model";
import { getScheduleDateRange } from "./lessons-reload.helpers";
import { CANCELLED_TAB_INDEX, COMPLETED_TAB_INDEX, UPCOMING_TAB_INDEX } from "./lessons-tabs.constants";
import * as tabsModel from "./lessons-tabs.model";
import * as viewModeModel from "./lessons-view-mode.model";

sample({
  clock: lessonModel.addLessonFx.doneData,
  source: {
    pagination: lessonModel.$upcomingPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      pagination.page,
      pagination.limit
    ),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentWeek: viewModeModel.$currentWeek,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode }) => lessonsViewMode === "weekly",
  fn: ({ currentWeek, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    weekStart: currentWeek.toISOString(),
    ...buildLessonFilterParams({ onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }),
  }),
  target: lessonModel.loadWeeklyLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: viewModeModel.$lessonsViewMode,
  filter: (lessonsViewMode) => lessonsViewMode === "schedule",
  fn: getScheduleDateRange,
  target: lessonModel.loadScheduleLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    upcomingPagination: lessonModel.$upcomingPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode, currentTab }) =>
    lessonsViewMode === "paged" && currentTab === UPCOMING_TAB_INDEX,
  fn: ({ upcomingPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      upcomingPagination.page,
      upcomingPagination.limit
    ),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    completedPagination: lessonModel.$completedPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode, currentTab }) =>
    lessonsViewMode === "paged" && currentTab === COMPLETED_TAB_INDEX,
  fn: ({ completedPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      completedPagination.page,
      completedPagination.limit
    ),
  target: lessonModel.loadCompletedLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    cancelledPagination: lessonModel.$cancelledPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode, currentTab }) =>
    lessonsViewMode === "paged" && currentTab === CANCELLED_TAB_INDEX,
  fn: ({ cancelledPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      cancelledPagination.page,
      cancelledPagination.limit
    ),
  target: lessonModel.loadCancelledLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    allPagination: lessonModel.$allPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode, paymentDateFrom, paymentDateTo }) =>
    lessonsViewMode === "paged" && (paymentDateFrom !== null || paymentDateTo !== null),
  fn: ({ allPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      allPagination.page,
      allPagination.limit
    ),
  target: lessonModel.loadAllLessonsFx,
});

sample({
  clock: lessonModel.removeLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    pagination: lessonModel.$upcomingPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode, currentTab }) =>
    lessonsViewMode === "paged" && currentTab === UPCOMING_TAB_INDEX,
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      pagination.page,
      pagination.limit
    ),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.removeLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    allPagination: lessonModel.$allPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode, paymentDateFrom, paymentDateTo }) =>
    lessonsViewMode === "paged" && (paymentDateFrom !== null || paymentDateTo !== null),
  fn: ({ allPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      allPagination.page,
      allPagination.limit
    ),
  target: lessonModel.loadAllLessonsFx,
});
