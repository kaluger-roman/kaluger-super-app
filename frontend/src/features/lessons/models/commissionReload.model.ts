import { sample } from "effector";

import { lessonModel, studentModel } from "@entities";

import { buildLessonFilterParams, buildPagedLessonParams } from "./lessonsFilters.helpers";
import * as filtersModel from "./lessonsFilters.model";
import { getScheduleDateRange } from "./lessonsReload.helpers";
import {
  CANCELLED_TAB_INDEX,
  COMPLETED_TAB_INDEX,
  UPCOMING_TAB_INDEX,
} from "./lessonsTabs.constants";
import * as tabsModel from "./lessonsTabs.model";
import * as viewModeModel from "./lessonsViewMode.model";

// A commission credit depends on every other lesson of the same student, so a
// mutation shifts badges and repayment progress far beyond the changed row.
// Patching a single item is not enough — the affected lists are refetched.
const lessonMutated = [
  lessonModel.addLessonFx.doneData,
  lessonModel.updateLessonFx.doneData,
  lessonModel.removeLessonFx.doneData,
];

// lessonsReload already refetches the weekly and schedule lists on an update,
// but not on add/remove — those two gaps are what this model covers.
const lessonAddedOrRemoved = [
  lessonModel.addLessonFx.doneData,
  lessonModel.removeLessonFx.doneData,
];

// The other direction: changing a student's commission (or archiving them)
// reshuffles the badges of every lesson of that student.
const studentMutated = [
  studentModel.updateStudentFx.doneData,
  studentModel.archiveStudentFx.doneData,
  studentModel.unarchiveStudentFx.doneData,
];

// Archived students keep their past lessons, so their progress shifts too —
// both lists are refreshed. The silent effect keeps this background refetch out
// of the blocking overlay: the tutor just edited a lesson, not the students.
sample({
  clock: lessonMutated,
  source: studentModel.$hasCommissionStudents,
  filter: Boolean,
  target: studentModel.studentsRefreshRequested,
});

sample({
  clock: [...lessonAddedOrRemoved, ...studentMutated],
  source: {
    hasCommissionStudents: studentModel.$hasCommissionStudents,
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentWeek: viewModeModel.$currentWeek,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ hasCommissionStudents, lessonsViewMode }) =>
    hasCommissionStudents && lessonsViewMode === "weekly",
  fn: ({ currentWeek, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    weekStart: currentWeek.toISOString(),
    ...buildLessonFilterParams({ onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }),
  }),
  target: lessonModel.loadWeeklyLessonsFx,
});

sample({
  clock: [...lessonAddedOrRemoved, ...studentMutated],
  source: {
    hasCommissionStudents: studentModel.$hasCommissionStudents,
    lessonsViewMode: viewModeModel.$lessonsViewMode,
  },
  filter: ({ hasCommissionStudents, lessonsViewMode }) =>
    hasCommissionStudents && lessonsViewMode === "schedule",
  fn: getScheduleDateRange,
  target: lessonModel.loadScheduleLessonsFx,
});

// lessonsReload refetches the paged tabs only on an update; adding or removing
// a lesson shifts the badges of the completed and cancelled tabs too.
sample({
  clock: [...lessonAddedOrRemoved, ...studentMutated],
  source: {
    hasCommissionStudents: studentModel.$hasCommissionStudents,
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    pagination: lessonModel.$completedPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ hasCommissionStudents, lessonsViewMode, currentTab }) =>
    hasCommissionStudents && lessonsViewMode === "paged" && currentTab === COMPLETED_TAB_INDEX,
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      pagination.page,
      pagination.limit
    ),
  target: lessonModel.loadCompletedLessonsFx,
});

sample({
  clock: [...lessonAddedOrRemoved, ...studentMutated],
  source: {
    hasCommissionStudents: studentModel.$hasCommissionStudents,
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    pagination: lessonModel.$cancelledPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ hasCommissionStudents, lessonsViewMode, currentTab }) =>
    hasCommissionStudents && lessonsViewMode === "paged" && currentTab === CANCELLED_TAB_INDEX,
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      pagination.page,
      pagination.limit
    ),
  target: lessonModel.loadCancelledLessonsFx,
});

// The upcoming tab is refetched by lessonsReload on every lesson mutation, so
// only the student side is missing here.
sample({
  clock: studentMutated,
  source: {
    hasCommissionStudents: studentModel.$hasCommissionStudents,
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    currentTab: tabsModel.$currentTab,
    pagination: lessonModel.$upcomingPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ hasCommissionStudents, lessonsViewMode, currentTab }) =>
    hasCommissionStudents && lessonsViewMode === "paged" && currentTab === UPCOMING_TAB_INDEX,
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) =>
    buildPagedLessonParams(
      { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo },
      pagination.page,
      pagination.limit
    ),
  target: lessonModel.loadUpcomingLessonsFx,
});
