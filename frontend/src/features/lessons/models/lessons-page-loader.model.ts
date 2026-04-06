import { sample } from "effector";

import { lessonModel } from "@entities";

import * as lessonsFiltersModel from "./lessons-filters.model";
import {
  getScheduleDateRangeParams,
  createWeeklyLessonParams,
  createPagedLessonParams,
} from "./lessons-page-loader.helpers";
import {
  ALL_TAB_INDEX,
  CANCELLED_TAB_INDEX,
  COMPLETED_TAB_INDEX,
  UPCOMING_TAB_INDEX,
} from "./lessons-tabs.constants";
import * as lessonsTabsModel from "./lessons-tabs.model";
import * as lessonsViewModeModel from "./lessons-view-mode.model";
import { LessonsPageGate } from "./lessons.model";

const pagedTabClock = [
  LessonsPageGate.open,
  lessonsTabsModel.$currentTab,
  lessonsViewModeModel.$lessonsViewMode,
  lessonsFiltersModel.$onlyUnpaid,
  lessonsFiltersModel.$onlyWithoutHomework,
];

const pagedTabSource = {
  currentTab: lessonsTabsModel.$currentTab,
  lessonsViewMode: lessonsViewModeModel.$lessonsViewMode,
  onlyUnpaid: lessonsFiltersModel.$onlyUnpaid,
  onlyWithoutHomework: lessonsFiltersModel.$onlyWithoutHomework,
  paymentDateFrom: lessonsFiltersModel.$paymentDateFrom,
  paymentDateTo: lessonsFiltersModel.$paymentDateTo,
};

sample({
  clock: [
    LessonsPageGate.open,
    lessonsViewModeModel.$lessonsViewMode,
    lessonsViewModeModel.$currentWeek,
    lessonsFiltersModel.$onlyUnpaid,
    lessonsFiltersModel.$onlyWithoutHomework,
    lessonsFiltersModel.$paymentDateFrom,
    lessonsFiltersModel.$paymentDateTo,
  ],
  source: {
    lessonsViewMode: lessonsViewModeModel.$lessonsViewMode,
    currentWeek: lessonsViewModeModel.$currentWeek,
    onlyUnpaid: lessonsFiltersModel.$onlyUnpaid,
    onlyWithoutHomework: lessonsFiltersModel.$onlyWithoutHomework,
    paymentDateFrom: lessonsFiltersModel.$paymentDateFrom,
    paymentDateTo: lessonsFiltersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode }) => lessonsViewMode === "weekly",
  fn: createWeeklyLessonParams,
  target: lessonModel.loadWeeklyLessonsFx,
});

sample({
  clock: [LessonsPageGate.open, lessonsViewModeModel.$lessonsViewMode],
  source: lessonsViewModeModel.$lessonsViewMode,
  filter: (lessonsViewMode) => lessonsViewMode === "schedule",
  fn: getScheduleDateRangeParams,
  target: lessonModel.loadScheduleLessonsFx,
});

// Tabs 0/1/2: do NOT include $paymentDateFrom/$paymentDateTo in clock —
// payment filter activation auto-switches to ALL tab, which has its own sample.
sample({
  clock: pagedTabClock,
  source: pagedTabSource,
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === UPCOMING_TAB_INDEX,
  fn: createPagedLessonParams,
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: pagedTabClock,
  source: pagedTabSource,
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === COMPLETED_TAB_INDEX,
  fn: createPagedLessonParams,
  target: lessonModel.loadCompletedLessonsFx,
});

sample({
  clock: pagedTabClock,
  source: pagedTabSource,
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === CANCELLED_TAB_INDEX,
  fn: createPagedLessonParams,
  target: lessonModel.loadCancelledLessonsFx,
});

// ALL tab: includes payment date stores in clock since filter changes should reload.
sample({
  clock: [
    ...pagedTabClock,
    lessonsFiltersModel.$paymentDateFrom,
    lessonsFiltersModel.$paymentDateTo,
  ],
  source: pagedTabSource,
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === ALL_TAB_INDEX,
  fn: createPagedLessonParams,
  target: lessonModel.loadAllLessonsFx,
});
