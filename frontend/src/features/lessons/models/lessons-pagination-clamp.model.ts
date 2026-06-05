import { sample } from "effector";

import { lessonModel } from "@entities";

import * as filtersModel from "./lessons-filters.model";
import { createLastPageParams, isPageBeyondLastPage } from "./lessons-pagination-clamp.helpers";

// When an action removes the last item(s) from the current page (e.g. marking the only
// unsent homework on the last page as sent, marking the last unpaid lesson as paid, or
// deleting the last lesson on a page), the backend echoes the now-empty page. Re-fetch the
// last page that still has items so the user lands there instead of being stranded on an
// empty page with the pagination control hidden.
const filtersSource = {
  onlyUnpaid: filtersModel.$onlyUnpaid,
  onlyWithoutHomework: filtersModel.$onlyWithoutHomework,
  paymentDateFrom: filtersModel.$paymentDateFrom,
  paymentDateTo: filtersModel.$paymentDateTo,
};

sample({
  clock: lessonModel.loadUpcomingLessonsFx.doneData,
  source: filtersSource,
  filter: (_filters, { pagination }) => isPageBeyondLastPage(pagination),
  fn: (filters, { pagination }) => createLastPageParams(filters, pagination),
  target: lessonModel.loadUpcomingLessonsFx,
});

sample({
  clock: lessonModel.loadCompletedLessonsFx.doneData,
  source: filtersSource,
  filter: (_filters, { pagination }) => isPageBeyondLastPage(pagination),
  fn: (filters, { pagination }) => createLastPageParams(filters, pagination),
  target: lessonModel.loadCompletedLessonsFx,
});

sample({
  clock: lessonModel.loadCancelledLessonsFx.doneData,
  source: filtersSource,
  filter: (_filters, { pagination }) => isPageBeyondLastPage(pagination),
  fn: (filters, { pagination }) => createLastPageParams(filters, pagination),
  target: lessonModel.loadCancelledLessonsFx,
});

sample({
  clock: lessonModel.loadAllLessonsFx.doneData,
  source: filtersSource,
  filter: (_filters, { pagination }) => isPageBeyondLastPage(pagination),
  fn: (filters, { pagination }) => createLastPageParams(filters, pagination),
  target: lessonModel.loadAllLessonsFx,
});
