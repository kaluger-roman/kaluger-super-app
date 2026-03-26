import { sample } from "effector";

import { lessonModel } from "@entities";
import { notificationsModel } from "@shared/model";

import * as filtersModel from "./lessons-filters.model";
import { getScheduleDateRange, extractErrorMessage } from "./lessons-reload.helpers";
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
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    page: pagination.page,
    limit: pagination.limit,
    onlyUnpaid,
    onlyWithoutHomework,
    ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
    ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
  }),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.addLessonFx.doneData,
  fn: () => "Урок создан",
  target: notificationsModel.showSuccessEvent,
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
    weekStart: currentWeek.toISOString() || "",
    onlyUnpaid,
    onlyWithoutHomework,
    ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
    ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
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
    upcomingPagination: lessonModel.$upcomingPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode }) => lessonsViewMode === "paged",
  fn: ({ upcomingPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    page: upcomingPagination.page,
    limit: upcomingPagination.limit,
    onlyUnpaid,
    onlyWithoutHomework,
    ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
    ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
  }),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    completedPagination: lessonModel.$completedPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode }) => lessonsViewMode === "paged",
  fn: ({ completedPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    page: completedPagination.page,
    limit: completedPagination.limit,
    onlyUnpaid,
    onlyWithoutHomework,
    ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
    ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
  }),
  target: lessonModel.loadCompletedLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  source: {
    lessonsViewMode: viewModeModel.$lessonsViewMode,
    cancelledPagination: lessonModel.$cancelledPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  filter: ({ lessonsViewMode }) => lessonsViewMode === "paged",
  fn: ({ cancelledPagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    page: cancelledPagination.page,
    limit: cancelledPagination.limit,
    onlyUnpaid,
    onlyWithoutHomework,
    ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
    ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
  }),
  target: lessonModel.loadCancelledLessonsFx,
});

sample({
  clock: lessonModel.updateLessonFx.doneData,
  fn: () => "Урок обновлен",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: lessonModel.removeLessonFx.doneData,
  source: {
    pagination: lessonModel.$upcomingPagination,
    onlyUnpaid: filtersModel.$onlyUnpaid,
    onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
    paymentDateFrom: filtersModel.$paymentDateFrom,
    paymentDateTo: filtersModel.$paymentDateTo,
  },
  fn: ({ pagination, onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }) => ({
    page: pagination.page,
    limit: pagination.limit,
    onlyUnpaid,
    onlyWithoutHomework,
    ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
    ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
  }),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.removeLessonFx.doneData,
  fn: () => "Урок удален",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: lessonModel.addLessonFx.failData,
  fn: (error) => extractErrorMessage(error, "Ошибка при создании урока"),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: lessonModel.updateLessonFx.failData,
  fn: (error) => extractErrorMessage(error, "Ошибка при обновлении урока"),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: lessonModel.removeLessonFx.failData,
  fn: (error) => extractErrorMessage(error, "Ошибка при удалении урока"),
  target: notificationsModel.showErrorEvent,
});
