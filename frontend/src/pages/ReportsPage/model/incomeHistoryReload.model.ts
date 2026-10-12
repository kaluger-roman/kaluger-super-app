import { combine, createEffect, createEvent, sample } from "effector";

import { lessonModel } from "@entities";
import { lessonsModel } from "@features";
import { extractAxiosError, lessonsApi, notificationsModel } from "@shared";

import {
  INCOME_HISTORY_LESSON_NOT_FOUND,
  INCOME_HISTORY_LESSON_OPEN_ERROR,
} from "./incomeHistory.constants";
import { buildReloadRequest, isNotFoundError, isReloadReady } from "./incomeHistory.helpers";
import * as incomeHistoryModel from "./incomeHistory.model";
import * as statisticsModel from "./statistics.model";

const $reloadSource = combine({
  history: incomeHistoryModel.$incomeHistory,
  historyRange: incomeHistoryModel.$historyRange,
  range: statisticsModel.$appliedRange,
});

export const incomeHistoryLessonOpened = createEvent<string>();
export const reportsReloadRequested = createEvent();

export const openLessonFx = createEffect((lessonId: string) => lessonsApi.getById(lessonId));

sample({ clock: incomeHistoryLessonOpened, target: openLessonFx });
sample({ clock: openLessonFx.doneData, target: lessonsModel.viewDialogOpened });

const lessonNotFound = sample({ clock: openLessonFx.failData, filter: isNotFoundError });

sample({
  clock: lessonNotFound,
  fn: () => INCOME_HISTORY_LESSON_NOT_FOUND,
  target: notificationsModel.showErrorEvent,
});
sample({ clock: lessonNotFound, target: reportsReloadRequested });

sample({
  clock: openLessonFx.failData,
  filter: (error) => !isNotFoundError(error),
  fn: (error) => extractAxiosError(error, INCOME_HISTORY_LESSON_OPEN_ERROR),
  target: notificationsModel.showErrorEvent,
});

const reloadRequested = sample({
  clock: [reportsReloadRequested, lessonModel.updateLessonFx.done, lessonModel.removeLessonFx.done],
  source: statisticsModel.ReportsPageGate.status,
  filter: Boolean,
});

sample({
  clock: reloadRequested,
  source: $reloadSource,
  filter: isReloadReady,
  fn: ({ range }) => range,
  target: statisticsModel.loadStatisticsFx,
});

// Reloading down to the last loaded day keeps the rendered days and the scroll position.
sample({
  clock: reloadRequested,
  source: $reloadSource,
  filter: isReloadReady,
  fn: buildReloadRequest,
  target: incomeHistoryModel.incomeHistoryRequested,
});
