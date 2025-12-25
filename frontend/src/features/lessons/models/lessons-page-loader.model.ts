import { sample } from "effector";

import { lessonModel } from "@entities";

import * as lessonsFiltersModel from "./lessons-filters.model";
import {
  getScheduleDateRangeParams,
  createWeeklyLessonParams,
  createPagedLessonParams,
} from "./lessons-page-loader.helpers";
import * as lessonsTabsModel from "./lessons-tabs.model";
import * as lessonsViewModeModel from "./lessons-view-mode.model";
import { LessonsPageGate } from "./lessons.model";

sample({
  clock: [
    LessonsPageGate.open,
    lessonsViewModeModel.$lessonsViewMode,
    lessonsViewModeModel.$currentWeek,
    lessonsFiltersModel.$onlyUnpaid,
    lessonsFiltersModel.$onlyWithoutHomework,
  ],
  source: {
    lessonsViewMode: lessonsViewModeModel.$lessonsViewMode,
    currentWeek: lessonsViewModeModel.$currentWeek,
    onlyUnpaid: lessonsFiltersModel.$onlyUnpaid,
    onlyWithoutHomework: lessonsFiltersModel.$onlyWithoutHomework,
  },
  filter: ({ lessonsViewMode }) => lessonsViewMode === "weekly",
  fn: createWeeklyLessonParams,
  target: lessonModel.loadWeeklyLessonsFx,
});

sample({
  clock: [
    LessonsPageGate.open,
    lessonsViewModeModel.$lessonsViewMode,
    lessonsFiltersModel.$onlyUnpaid,
    lessonsFiltersModel.$onlyWithoutHomework,
  ],
  source: lessonsViewModeModel.$lessonsViewMode,
  filter: (lessonsViewMode) => lessonsViewMode === "schedule",
  fn: getScheduleDateRangeParams,
  target: lessonModel.loadScheduleLessonsFx,
});

sample({
  clock: [
    LessonsPageGate.open,
    lessonsTabsModel.$currentTab,
    lessonsViewModeModel.$lessonsViewMode,
    lessonsFiltersModel.$onlyUnpaid,
    lessonsFiltersModel.$onlyWithoutHomework,
  ],
  source: {
    currentTab: lessonsTabsModel.$currentTab,
    lessonsViewMode: lessonsViewModeModel.$lessonsViewMode,
    onlyUnpaid: lessonsFiltersModel.$onlyUnpaid,
    onlyWithoutHomework: lessonsFiltersModel.$onlyWithoutHomework,
  },
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === 0,
  fn: createPagedLessonParams,
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: [
    LessonsPageGate.open,
    lessonsTabsModel.$currentTab,
    lessonsViewModeModel.$lessonsViewMode,
    lessonsFiltersModel.$onlyUnpaid,
    lessonsFiltersModel.$onlyWithoutHomework,
  ],
  source: {
    currentTab: lessonsTabsModel.$currentTab,
    lessonsViewMode: lessonsViewModeModel.$lessonsViewMode,
    onlyUnpaid: lessonsFiltersModel.$onlyUnpaid,
    onlyWithoutHomework: lessonsFiltersModel.$onlyWithoutHomework,
  },
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === 1,
  fn: createPagedLessonParams,
  target: lessonModel.loadCompletedLessonsFx,
});

sample({
  clock: [
    LessonsPageGate.open,
    lessonsTabsModel.$currentTab,
    lessonsViewModeModel.$lessonsViewMode,
    lessonsFiltersModel.$onlyUnpaid,
    lessonsFiltersModel.$onlyWithoutHomework,
  ],
  source: {
    currentTab: lessonsTabsModel.$currentTab,
    lessonsViewMode: lessonsViewModeModel.$lessonsViewMode,
    onlyUnpaid: lessonsFiltersModel.$onlyUnpaid,
    onlyWithoutHomework: lessonsFiltersModel.$onlyWithoutHomework,
  },
  filter: ({ lessonsViewMode, currentTab }) => lessonsViewMode === "paged" && currentTab === 2,
  fn: createPagedLessonParams,
  target: lessonModel.loadCancelledLessonsFx,
});
